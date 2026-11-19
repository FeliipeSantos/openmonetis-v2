import {
  cards,
  categories,
  db,
  financialAccounts,
  invoicePaymentAllocations,
  invoicePayments,
  people,
  personSettlements,
  recurringTransactionRules,
  recurringTransactionSplits,
  transactionSplits,
  transactions,
} from "@openmonetis/db";
import { getPersonRecurringBalanceOccurrencePeriods } from "@openmonetis/domain/person-settlements";
import { getPeriodEndDate, isExpenseReduction } from "@openmonetis/domain/transactions";
import { and, asc, desc, eq, gte, isNull, lt, lte, notExists, or, sql } from "drizzle-orm";
import type { PersonSettlementsRepository } from "../services/person-settlements.service";
import { effectiveRecurringEndDateSql } from "./recurring-transactions.repository";
import {
  effectiveSplitAmountSql,
  effectiveTransactionAmountSql,
  recurringOccurrenceOverridesSql,
} from "./settlements.repository";

const settlementColumns = {
  id: personSettlements.id,
  userId: personSettlements.userId,
  personId: personSettlements.personId,
  invoicePaymentAllocationId: personSettlements.invoicePaymentAllocationId,
  amount: personSettlements.amount,
  receivedAt: personSettlements.receivedAt,
  period: personSettlements.period,
  note: personSettlements.note,
  createdAt: personSettlements.createdAt,
};

export const personSettlementsRepository: PersonSettlementsRepository = {
  async findPersonForUser(personId, userId) {
    const [person] = await db
      .select({ id: people.id, name: people.name, role: people.role, status: people.status })
      .from(people)
      .where(and(eq(people.id, personId), eq(people.userId, userId)))
      .limit(1);
    return person ?? null;
  },

  async listExternalPeopleForUser(userId) {
    return db
      .select({
        id: people.id,
        name: people.name,
        role: people.role,
        status: people.status,
        avatarUrl: people.avatarUrl,
      })
      .from(people)
      .where(and(eq(people.userId, userId), eq(people.role, "external")))
      .orderBy(asc(people.name));
  },

  async listSettlementsForPerson(personId, userId, period) {
    const periodStart = new Date(`${period}-01T00:00:00.000Z`);
    const nextPeriodStart = new Date(
      Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1),
    );

    const recorded = await db
      .select(settlementColumns)
      .from(personSettlements)
      .leftJoin(
        invoicePaymentAllocations,
        and(
          eq(invoicePaymentAllocations.id, personSettlements.invoicePaymentAllocationId),
          eq(invoicePaymentAllocations.userId, userId),
        ),
      )
      .leftJoin(
        invoicePayments,
        and(
          eq(invoicePayments.id, invoicePaymentAllocations.paymentId),
          eq(invoicePayments.userId, userId),
        ),
      )
      .where(
        and(
          eq(personSettlements.personId, personId),
          eq(personSettlements.userId, userId),
          or(
            and(
              isNull(personSettlements.invoicePaymentAllocationId),
              eq(personSettlements.period, period),
            ),
            // Repasses recorded before the reference month existed count by receipt date.
            and(
              isNull(personSettlements.invoicePaymentAllocationId),
              isNull(personSettlements.period),
              gte(personSettlements.receivedAt, periodStart),
              lt(personSettlements.receivedAt, nextPeriodStart),
            ),
            eq(invoicePayments.period, period),
          ),
        ),
      )
      .orderBy(desc(personSettlements.receivedAt), desc(personSettlements.createdAt));

    // The person's share paid on an invoice of the period settles the period too. Invoice
    // payments no longer create repasse rows, so they are read straight from the allocations
    // (skipping any older allocation that still has its own repasse row).
    const fromInvoicePayments = await db
      .select({
        id: invoicePaymentAllocations.id,
        userId: invoicePaymentAllocations.userId,
        personId: invoicePaymentAllocations.personId,
        invoicePaymentAllocationId: invoicePaymentAllocations.id,
        amount: invoicePaymentAllocations.amount,
        receivedAt: invoicePayments.paidAt,
        createdAt: invoicePaymentAllocations.createdAt,
      })
      .from(invoicePaymentAllocations)
      .innerJoin(
        invoicePayments,
        and(
          eq(invoicePayments.id, invoicePaymentAllocations.paymentId),
          eq(invoicePayments.userId, userId),
        ),
      )
      .where(
        and(
          eq(invoicePaymentAllocations.userId, userId),
          eq(invoicePaymentAllocations.personId, personId),
          eq(invoicePayments.period, period),
          notExists(
            db
              .select({ id: personSettlements.id })
              .from(personSettlements)
              .where(
                eq(personSettlements.invoicePaymentAllocationId, invoicePaymentAllocations.id),
              ),
          ),
        ),
      );

    return [
      ...recorded,
      ...fromInvoicePayments.map((row) => ({ ...row, period, note: null })),
    ].sort(
      (left, right) =>
        right.receivedAt.getTime() - left.receivedAt.getTime() ||
        right.createdAt.getTime() - left.createdAt.getTime(),
    );
  },

  async listBalanceEntriesForPerson(personId, userId, period) {
    const rows = await db
      .select({
        id: transactions.id,
        name: transactions.name,
        purchaseDate: transactions.purchaseDate,
        currentInstallment: transactions.currentInstallment,
        installmentCount: transactions.installmentCount,
        paymentMethod: transactions.paymentMethod,
        accountName: financialAccounts.name,
        accountLogo: financialAccounts.logo,
        cardName: cards.name,
        cardLogo: cards.logo,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        kind: transactions.origin,
        type: transactions.type,
        amount: effectiveTransactionAmountSql.as("amount"),
        splitAmount: effectiveSplitAmountSql.as("split_amount"),
      })
      .from(transactions)
      .leftJoin(
        transactionSplits,
        and(
          eq(transactionSplits.transactionId, transactions.id),
          eq(transactionSplits.userId, userId),
          eq(transactionSplits.personId, personId),
        ),
      )
      .leftJoin(
        financialAccounts,
        and(eq(financialAccounts.id, transactions.accountId), eq(financialAccounts.userId, userId)),
      )
      .leftJoin(cards, and(eq(cards.id, transactions.cardId), eq(cards.userId, userId)))
      .leftJoin(
        categories,
        and(eq(categories.id, transactions.categoryId), eq(categories.userId, userId)),
      )
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.period, period),
          or(
            and(eq(transactions.origin, "regular"), eq(transactions.type, "expense")),
            eq(transactions.origin, "refund"),
            eq(transactions.origin, "invoiceAdjustment"),
          ),
          or(eq(transactions.personId, personId), eq(transactionSplits.personId, personId)),
        ),
      );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      date: row.purchaseDate.toISOString().slice(0, 10),
      currentInstallment: row.currentInstallment,
      installmentCount: row.installmentCount,
      paymentMethod: row.paymentMethod,
      accountName: row.accountName,
      accountLogo: row.accountLogo,
      cardName: row.cardName,
      cardLogo: row.cardLogo,
      categoryName: row.categoryName,
      categoryIcon: row.categoryIcon,
      kind: isExpenseReduction({ origin: row.kind, type: row.type, amount: row.amount })
        ? ("refund" as const)
        : ("expense" as const),
      amount: row.splitAmount ?? row.amount,
    }));
  },

  async listRecurringBalanceRulesForPeriod(userId, period) {
    const occurrencePeriods = getPersonRecurringBalanceOccurrencePeriods(period);
    const periodStart = new Date(`${occurrencePeriods[0]}-01T00:00:00.000Z`);
    const periodEnd = getPeriodEndDate(occurrencePeriods.at(-1) as string);
    const rows = await db
      .select({
        id: recurringTransactionRules.id,
        name: recurringTransactionRules.name,
        accountName: financialAccounts.name,
        accountLogo: financialAccounts.logo,
        cardName: cards.name,
        cardLogo: cards.logo,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        seriesId: recurringTransactionRules.seriesId,
        personId: recurringTransactionRules.personId,
        amount: recurringTransactionRules.amount,
        paymentMethod: recurringTransactionRules.paymentMethod,
        card: {
          closingDay: cards.closingDay,
          closingRuleType: cards.closingRuleType,
          closingOffsetDays: cards.closingOffsetDays,
          closingOffsetMode: cards.closingOffsetMode,
          closingDayPurchasesNextInvoice: cards.closingDayPurchasesNextInvoice,
          dueDay: cards.dueDay,
        },
        anchorDate: recurringTransactionRules.anchorDate,
        startDate: recurringTransactionRules.startDate,
        endDate: effectiveRecurringEndDateSql,
        dueDate: recurringTransactionRules.dueDate,

        configuredEndDate: sql<
          string | null
        >`to_char(${recurringTransactionRules.recurrenceEndDate}, 'YYYY-MM-DD')`.as(
          "configured_end_date",
        ),
        occurrenceOverrides: recurringOccurrenceOverridesSql,
        frequency: recurringTransactionRules.frequency,
        splitPersonId: recurringTransactionSplits.personId,
        splitAmount: recurringTransactionSplits.amount,
      })
      .from(recurringTransactionRules)
      .leftJoin(
        cards,
        and(eq(cards.id, recurringTransactionRules.cardId), eq(cards.userId, userId)),
      )
      .leftJoin(
        financialAccounts,
        and(
          eq(financialAccounts.id, recurringTransactionRules.accountId),
          eq(financialAccounts.userId, userId),
        ),
      )
      .leftJoin(
        categories,
        and(eq(categories.id, recurringTransactionRules.categoryId), eq(categories.userId, userId)),
      )
      .leftJoin(
        recurringTransactionSplits,
        and(
          eq(recurringTransactionSplits.recurringRuleId, recurringTransactionRules.id),
          eq(recurringTransactionSplits.userId, userId),
        ),
      )
      .where(
        and(
          eq(recurringTransactionRules.userId, userId),
          eq(recurringTransactionRules.type, "expense"),
          eq(recurringTransactionRules.status, "active"),
          lte(recurringTransactionRules.startDate, periodEnd),
          or(
            isNull(recurringTransactionRules.endDate),
            gte(recurringTransactionRules.endDate, periodStart),
          ),
        ),
      );
    const grouped = new Map<string, (typeof rows)[number][]>();
    for (const row of rows) grouped.set(row.id, [...(grouped.get(row.id) ?? []), row]);
    return [...grouped.values()].map((group) => {
      const row = group[0] as (typeof rows)[number];
      return {
        id: row.id,
        name: row.name,
        accountName: row.accountName,
        accountLogo: row.accountLogo,
        cardName: row.cardName,
        cardLogo: row.cardLogo,
        categoryName: row.categoryName,
        categoryIcon: row.categoryIcon,
        seriesId: row.seriesId,
        personId: row.personId,
        amount: row.amount,
        paymentMethod: row.paymentMethod,
        card: row.card,
        anchorDate: row.anchorDate.toISOString().slice(0, 10),
        startDate: row.startDate.toISOString().slice(0, 10),
        endDate: row.endDate?.toISOString().slice(0, 10) ?? null,
        occurrenceOverrides: row.occurrenceOverrides,
        dueDate: row.dueDate?.toISOString().slice(0, 10) ?? null,

        configuredEndDate: row.configuredEndDate,
        frequency: row.frequency,
        splits: group.flatMap((item) =>
          item.splitPersonId && item.splitAmount !== null
            ? [{ personId: item.splitPersonId, amount: item.splitAmount }]
            : [],
        ),
      };
    });
  },

  async createSettlement(input) {
    return db.transaction(async (tx) => {
      const [person] = await tx
        .select({ id: people.id, role: people.role, status: people.status })
        .from(people)
        .where(and(eq(people.id, input.personId), eq(people.userId, input.userId)))
        .for("update")
        .limit(1);
      if (person?.role !== "external" || person.status !== "active") {
        return null;
      }
      const [settlement] = await tx
        .insert(personSettlements)
        .values({
          userId: input.userId,
          personId: input.personId,
          amount: input.amount,
          receivedAt: input.receivedAt,
          period: input.period,
          note: input.note,
        })
        .returning(settlementColumns);
      return settlement ?? null;
    });
  },

  async deleteSettlementForUser(id, userId) {
    return db.transaction(async (tx) => {
      const [settlement] = await tx
        .select(settlementColumns)
        .from(personSettlements)
        .where(
          and(
            eq(personSettlements.id, id),
            eq(personSettlements.userId, userId),
            isNull(personSettlements.invoicePaymentAllocationId),
          ),
        )
        .for("update")
        .limit(1);
      if (!settlement) return null;

      await tx
        .delete(personSettlements)
        .where(and(eq(personSettlements.id, id), eq(personSettlements.userId, userId)));
      return settlement;
    });
  },
};
