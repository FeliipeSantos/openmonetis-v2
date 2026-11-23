import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Database-level guards for the fork's customizations whose logic lives in SQL queries (see
 * docs/fork-customizations.md). Unit tests cover the domain and services; these catch an
 * upstream merge that silently changes a query the fork depends on.
 */
test("fork queries: installment incomes in commitments and invoice shares as repasses", {
  skip: process.env.FORK_INTEGRATION_TEST !== "1",
}, async () => {
  const require = createRequire(new URL("../../../packages/db/package.json", import.meta.url));
  require("dotenv").config({
    path: fileURLToPath(new URL("../../../.env", import.meta.url)),
    quiet: true,
  });
  const { Pool } = require("pg");
  const { migrate } = require("drizzle-orm/node-postgres/migrator");
  const { resolveDatabaseUrl } = await import("../../../packages/db/src/database-url");
  assert.notEqual(process.env.NODE_ENV, "production");
  const connectionUrl = new URL(process.env.TEST_DATABASE_URL ?? resolveDatabaseUrl());
  const admin = new Pool({ connectionString: connectionUrl.toString() });
  const databaseName = `openmonetis_fork_test_${Date.now()}`;
  const originalExternalUrl = process.env.EXTERNAL_DATABASE_URL;
  const originalNodeEnv = process.env.NODE_ENV;
  let applicationPool: { end(): Promise<void> } | undefined;
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  try {
    connectionUrl.pathname = `/${databaseName}`;
    process.env.NODE_ENV = "test";
    process.env.EXTERNAL_DATABASE_URL = connectionUrl.toString();
    const { db, pool, ...schema } = await import("@openmonetis/db");
    applicationPool = pool;
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL("../../../packages/db/drizzle", import.meta.url)),
    });

    const [owner] = await db
      .insert(schema.user)
      .values({ name: "Owner", email: "owner@example.test" })
      .returning();
    const [me, vitoria] = await db
      .insert(schema.people)
      .values([
        { userId: owner.id, name: "Felipe", role: "admin" },
        { userId: owner.id, name: "Vitoria", role: "external" },
      ])
      .returning();
    const [account] = await db
      .insert(schema.financialAccounts)
      .values({ userId: owner.id, name: "Conta", type: "checking" })
      .returning();
    const [card] = await db
      .insert(schema.cards)
      .values({
        userId: owner.id,
        accountId: account.id,
        name: "Nubank",
        closingDay: 30,
        dueDay: 10,
        limit: "10000",
      })
      .returning();

    // --- Commitments: the month's installment of an installment income is expected income.
    const [series] = await db
      .insert(schema.installmentSeries)
      .values({
        userId: owner.id,
        totalInstallments: 3,
        trackedFromInstallment: 1,
        originalAmount: "1890.00",
      })
      .returning();
    const [expenseSeries] = await db
      .insert(schema.installmentSeries)
      .values({
        userId: owner.id,
        totalInstallments: 2,
        trackedFromInstallment: 1,
        originalAmount: "200.00",
      })
      .returning();
    const base = {
      userId: owner.id,
      personId: me.id,
      accountId: account.id,
      paymentMethod: "pix" as const,
      purchaseDate: new Date("2027-01-05T00:00:00.000Z"),
      period: "2027-01",
    };
    await db.insert(schema.transactions).values([
      {
        ...base,
        type: "income",
        condition: "installment",
        name: "Cruzeiro - Esposa",
        amount: "630.00",
        seriesId: series.id,
        installmentCount: 3,
        currentInstallment: 1,
      },
      { ...base, type: "income", condition: "single", name: "Salário", amount: "9700.00" },
      {
        ...base,
        type: "expense",
        condition: "installment",
        name: "Parcela de despesa",
        amount: "-100.00",
        seriesId: expenseSeries.id,
        installmentCount: 2,
        currentInstallment: 1,
      },
    ]);

    const { commitmentsRepository } = await import("./repositories/commitments.repository");
    const entries = await commitmentsRepository.listSingleEntriesForUser(
      owner.id,
      "2027-01",
      "2027-01",
    );
    const incomes = entries
      .filter((entry) => entry.type === "income")
      .map((entry) => Number(entry.amount))
      .sort((left, right) => left - right);
    assert.deepEqual(incomes, [630, 9700], "installment incomes count as expected income");
    assert.ok(
      entries.every((entry) => entry.type !== "expense" || Number(entry.amount) !== -100),
      "installment expenses stay in their own layer, not counted twice",
    );

    // --- Settlements: the person's share paid on an invoice settles the invoice's month.
    const [payment] = await db
      .insert(schema.invoicePayments)
      .values({
        userId: owner.id,
        cardId: card.id,
        period: "2026-12",
        amount: "225.00",
        paidAt: new Date("2026-11-19T00:00:00.000Z"),
      })
      .returning();
    await db.insert(schema.invoicePaymentAllocations).values({
      userId: owner.id,
      paymentId: payment.id,
      personId: vitoria.id,
      amount: "225.00",
    });
    // A repasse received in November for the December invoice belongs to December.
    await db.insert(schema.personSettlements).values({
      userId: owner.id,
      personId: vitoria.id,
      amount: "30.00",
      receivedAt: new Date("2026-11-19T00:00:00.000Z"),
      period: "2026-12",
    });

    const { personSettlementsRepository } = await import(
      "./repositories/person-settlements.repository"
    );
    const december = await personSettlementsRepository.listSettlementsForPerson(
      vitoria.id,
      owner.id,
      "2026-12",
    );
    assert.deepEqual(
      december
        .map((item) => [Number(item.amount), item.invoicePaymentAllocationId !== null])
        .sort(),
      [
        [225, true],
        [30, false],
      ].sort(),
      "the invoice share and the repasse for December both settle December",
    );
    const november = await personSettlementsRepository.listSettlementsForPerson(
      vitoria.id,
      owner.id,
      "2026-11",
    );
    assert.deepEqual(november, [], "nothing leaks into the month the money was received");
  } finally {
    await applicationPool?.end();
    if (originalExternalUrl === undefined) delete process.env.EXTERNAL_DATABASE_URL;
    else process.env.EXTERNAL_DATABASE_URL = originalExternalUrl;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin.end();
  }
});
