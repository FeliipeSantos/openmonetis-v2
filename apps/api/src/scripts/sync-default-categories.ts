#!/usr/bin/env tsx

/**
 * Brings existing accounts to the current default categories.
 *
 * Without flags it only inserts what is missing. With `--replace` it first removes the categories
 * that are neither system nor default ones, but only those with no transactions, budgets,
 * recurrences or remaining subcategories; categories still in use are kept and listed.
 *
 *   pnpm db:sync-categories -- --email=<email> [--replace]
 *   pnpm db:sync-categories -- --all [--replace]
 */
import { db, pool, user } from "@openmonetis/db";
import { asc, eq } from "drizzle-orm";
import { categoriesRepository } from "../repositories/categories.repository";
import { createCategoriesService } from "../services/categories.service";

const usage = "Uso: pnpm db:sync-categories -- --email=<email> | --all [--replace]";

function parseOptions(argv: string[]) {
  const all = argv.includes("--all");
  const email = argv
    .find((argument) => argument.startsWith("--email="))
    ?.slice("--email=".length)
    .trim()
    .toLowerCase();
  if (all === Boolean(email)) throw new Error(`Informe exatamente um alvo. ${usage}`);
  return { email: email ?? null, replace: argv.includes("--replace") };
}

async function syncDefaultCategories(argv = process.argv.slice(2)) {
  const options = parseOptions(argv);
  const users = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(options.email ? eq(user.email, options.email) : undefined)
    .orderBy(asc(user.createdAt));
  if (!users.length) throw new Error(`Nenhuma conta encontrada. ${usage}`);

  const service = createCategoriesService(categoriesRepository);
  for (const account of users) {
    if (options.replace) {
      const { removed, kept } = await service.removeNonDefaults(account.id);
      console.log(`${account.email}: ${removed.length} categorias fora do padrão removidas.`);
      if (kept.length) {
        console.log(
          `${account.email}: mantidas por estarem em uso (lançamentos, orçamentos ou recorrências): ${kept.join(", ")}.`,
        );
      }
    }
    const added = await service.syncDefaults(account.id);
    console.log(
      `${account.email}: ${added.categories} categorias e ${added.subcategories} subcategorias adicionadas; ${added.icons} ícones vazios preenchidos.`,
    );
  }
}

try {
  await syncDefaultCategories();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Erro inesperado ao sincronizar.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
