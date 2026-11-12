import type { CardClosingRule } from "./cards";
import { getRecurringDueDate } from "./recurring-expenses";
import { getOccurrenceAmount, type SettlementAwareRule } from "./settlements";
import {
  addMonthsToPeriod,
  calculateExpenseImpact,
  deriveTransactionPeriod,
  listRecurrenceDatesInPeriod,
  type PaymentMethod,
  type RecurrenceFrequency,
  type TransactionOrigin,
  type TransactionType,
} from "./transactions";

export const budgetStatuses = ["onTrack", "warning", "reached", "exceeded"] as const;
export type BudgetStatus = (typeof budgetStatuses)[number];

export const budgetWarningThreshold = 80;

export type BudgetCreateDraft = {
  userId: string;
  categoryId: string;
  period: string;
  amount: string;
  isRecurring?: boolean;
};

export type BudgetSpendingEntry = {
  categoryId: string | null;
  origin: TransactionOrigin;
  type: TransactionType;
  amount: string | number;
};

export type BudgetRecurringRule = SettlementAwareRule & {
  categoryId: string | null;
  type: TransactionType;
  amount: string | number;
  anchorDate: string;
  startDate: string;
  endDate?: string | null;
  frequency: RecurrenceFrequency;
  paymentMethod: PaymentMethod;
  dueDate: string | null;
  card: { closingDay: number | null; closingRule?: CardClosingRule; dueDay: number } | null;
  status: "active" | "paused" | "cancelled";
};

export type BudgetProgress = {
  actualSpentAmount: number;
  projectedAmount: number;
  committedAmount: number;
  remainingAmount: number;
  exceededAmount: number;
  usagePercentage: number;
  status: BudgetStatus;
};

export type BudgetSpending = {
  actualByCategory: Map<string, number>;
  projectedByCategory: Map<string, number>;
  uncategorizedActualAmount: number;
  uncategorizedProjectedAmount: number;
};

export type BudgetOverviewCalculation = {
  progressByCategory: Map<string, BudgetProgress>;
  allocatedAmount: number;
  actualSpentAmount: number;
  projectedAmount: number;
  committedAmount: number;
  availableAmount: number;
  exceededAmount: number;
  unbudgetedCommittedAmount: number;
  unbudgetedItems: Array<{ categoryId: string | null; committedAmount: number }>;
  warningCount: number;
};

export function createBudgetDraft(input: {
  userId: string;
  categoryId: string;
  period: string;
  amount: number;
  isRecurring?: boolean;
}): BudgetCreateDraft {
  return {
    userId: input.userId,
    categoryId: input.categoryId,
    period: input.period,
    amount: input.amount.toFixed(2),
    isRecurring: input.isRecurring ?? false,
  };
}

export type BudgetPeriodCandidate = {
  categoryId: string;
  period: string;
  isRecurring: boolean;
  recurrenceEndPeriod: string | null;
};

/**
 * The budget each category has in `period`: its own budget for that month, otherwise the latest
 * earlier one when it is recurring and has not ended by then. A later budget of the category,
 * recurring or not, replaces an earlier recurring one from its month on. `inheritedFrom` is the
 * month the budget was set in when it comes from an earlier month.
 */
export function resolveBudgetsForPeriod<T extends BudgetPeriodCandidate>(
  budgets: readonly T[],
  period: string,
): Array<T & { inheritedFrom: string | null }> {
  const latestByCategory = new Map<string, T>();
  for (const budget of budgets) {
    if (budget.period > period) continue;
    const current = latestByCategory.get(budget.categoryId);
    if (!current || budget.period > current.period) latestByCategory.set(budget.categoryId, budget);
  }
  return [...latestByCategory.values()].flatMap(
    (budget): Array<T & { inheritedFrom: string | null }> => {
      if (budget.period === period) return [{ ...budget, inheritedFrom: null }];
      const active =
        budget.isRecurring && (!budget.recurrenceEndPeriod || budget.recurrenceEndPeriod >= period);
      return active ? [{ ...budget, inheritedFrom: budget.period }] : [];
    },
  );
}

export function calculateBudgetProgress(
  limit: number,
  actualSpent: number,
  projected = 0,
): BudgetProgress {
  const normalizedLimit = Math.max(0, roundMoney(limit));
  const actualSpentAmount = Math.max(0, roundMoney(actualSpent));
  const projectedAmount = Math.max(0, roundMoney(projected));
  const committedAmount = roundMoney(actualSpentAmount + projectedAmount);
  const remainingAmount = roundMoney(Math.max(normalizedLimit - committedAmount, 0));
  const exceededAmount = roundMoney(Math.max(committedAmount - normalizedLimit, 0));
  const usagePercentage =
    normalizedLimit > 0 ? roundToOneDecimal((committedAmount / normalizedLimit) * 100) : 0;
  const status = resolveBudgetStatus(normalizedLimit, committedAmount, usagePercentage);

  return {
    actualSpentAmount,
    projectedAmount,
    committedAmount,
    remainingAmount,
    exceededAmount,
    usagePercentage,
    status,
  };
}

export function calculateBudgetSpending(
  entries: BudgetSpendingEntry[],
  recurringRules: BudgetRecurringRule[],
  period: string,
): BudgetSpending {
  const actualByCategory = new Map<string, number>();
  const projectedByCategory = new Map<string, number>();
  let uncategorizedActualAmount = 0;
  let uncategorizedProjectedAmount = 0;

  for (const entry of entries) {
    const expenseImpact = calculateExpenseImpact(entry);
    if (
      entry.origin === "invoicePayment" ||
      entry.origin === "accountBalanceAdjustment" ||
      expenseImpact === 0
    ) {
      continue;
    }
    if (entry.categoryId) addSignedAmount(actualByCategory, entry.categoryId, expenseImpact);
    else uncategorizedActualAmount += expenseImpact;
  }

  for (const rule of recurringRules) {
    if (rule.type !== "expense" || rule.status !== "active") continue;

    for (const occurrencePeriod of [
      addMonthsToPeriod(period, -2),
      addMonthsToPeriod(period, -1),
      period,
      addMonthsToPeriod(period, 1),
    ]) {
      for (const purchaseDate of listRecurrenceDatesInPeriod({
        dueDate: rule.dueDate,

        recurrenceEndDate: rule.configuredEndDate,

        anchorDate: rule.anchorDate,
        startDate: rule.startDate,
        endDate: rule.endDate,
        frequency: rule.frequency,
        period: occurrencePeriod,
      })) {
        const dueDate = getRecurringDueDate(rule.dueDate, purchaseDate);
        const transactionPeriod = deriveTransactionPeriod({
          paymentMethod: rule.paymentMethod,
          purchaseDate,
          dueDate,
          card: rule.card,
        });

        if (transactionPeriod === period) {
          if (rule.categoryId)
            addAmount(
              projectedByCategory,
              rule.categoryId,
              getOccurrenceAmount(rule, purchaseDate, rule.amount),
            );
          else
            uncategorizedProjectedAmount += normalizedAmount(
              getOccurrenceAmount(rule, purchaseDate, rule.amount),
            );
        }
      }
    }
  }

  return {
    actualByCategory: roundedMap(actualByCategory),
    projectedByCategory: roundedMap(projectedByCategory),
    uncategorizedActualAmount: roundMoney(uncategorizedActualAmount),
    uncategorizedProjectedAmount: roundMoney(uncategorizedProjectedAmount),
  };
}

/**
 * Budgets against the month's spending. A budget on a main category covers it and every one of its
 * subcategories; a budget on a subcategory covers only that subcategory. `categoryParents` maps each
 * category id to its main category (or null). When a main category and one of its subcategories are
 * both budgeted, the subcategory still gets its own progress but is counted once in the totals.
 */
export function calculateBudgetOverview(
  budgetLimits: Array<{ categoryId: string; amount: string | number }>,
  spending: BudgetSpending,
  categoryParents: ReadonlyMap<string, string | null> = new Map(),
): BudgetOverviewCalculation {
  const progressByCategory = new Map<string, BudgetProgress>();
  const budgetedCategoryIds = new Set(budgetLimits.map((budget) => budget.categoryId));
  const coveredCategoryIds = new Set<string>();
  let allocatedAmount = 0;
  let actualSpentAmount = 0;
  let projectedAmount = 0;
  let committedAmount = 0;
  let availableAmount = 0;
  let exceededAmount = 0;
  let warningCount = 0;

  const coveredBy = (categoryId: string) => [
    categoryId,
    ...[...categoryParents]
      .filter(([, parentId]) => parentId === categoryId)
      .map(([childId]) => childId),
  ];
  const sumOver = (amounts: Map<string, number>, categoryIds: string[]) =>
    categoryIds.reduce((total, categoryId) => total + (amounts.get(categoryId) ?? 0), 0);

  for (const budget of budgetLimits) {
    const amount = Math.abs(Number(budget.amount));
    const categoryIds = coveredBy(budget.categoryId);
    for (const categoryId of categoryIds) coveredCategoryIds.add(categoryId);
    const progress = calculateBudgetProgress(
      amount,
      sumOver(spending.actualByCategory, categoryIds),
      sumOver(spending.projectedByCategory, categoryIds),
    );
    progressByCategory.set(budget.categoryId, progress);
    allocatedAmount += amount;
    availableAmount += progress.remainingAmount;
    exceededAmount += progress.exceededAmount;
    if (progress.status !== "onTrack") warningCount += 1;

    const parentId = categoryParents.get(budget.categoryId);
    if (parentId && budgetedCategoryIds.has(parentId)) continue;
    actualSpentAmount += progress.actualSpentAmount;
    projectedAmount += progress.projectedAmount;
    committedAmount += progress.committedAmount;
  }

  const unbudgetedItems = [
    ...new Set([...spending.actualByCategory.keys(), ...spending.projectedByCategory.keys()]),
  ]
    .filter((categoryId) => !coveredCategoryIds.has(categoryId))
    .map((categoryId) => ({
      categoryId: categoryId as string | null,
      committedAmount: roundMoney(
        Math.max(0, spending.actualByCategory.get(categoryId) ?? 0) +
          Math.max(0, spending.projectedByCategory.get(categoryId) ?? 0),
      ),
    }));
  unbudgetedItems.push({
    categoryId: null,
    committedAmount: Math.max(
      0,
      roundMoney(spending.uncategorizedActualAmount + spending.uncategorizedProjectedAmount),
    ),
  });
  const positiveUnbudgetedItems = unbudgetedItems
    .filter((item) => item.committedAmount > 0)
    .sort((left, right) => right.committedAmount - left.committedAmount);
  const unbudgetedCommittedAmount = roundMoney(
    positiveUnbudgetedItems.reduce((total, item) => total + item.committedAmount, 0),
  );

  allocatedAmount = roundMoney(allocatedAmount);

  return {
    progressByCategory,
    allocatedAmount,
    actualSpentAmount: roundMoney(actualSpentAmount),
    projectedAmount: roundMoney(projectedAmount),
    committedAmount: roundMoney(committedAmount),
    availableAmount: roundMoney(availableAmount),
    exceededAmount: roundMoney(exceededAmount),
    unbudgetedCommittedAmount: Math.max(0, unbudgetedCommittedAmount),
    unbudgetedItems: positiveUnbudgetedItems,
    warningCount,
  };
}

export function getPreviousBudgetPeriod(period: string) {
  return addMonthsToPeriod(period, -1);
}

function resolveBudgetStatus(limit: number, spent: number, usagePercentage: number): BudgetStatus {
  if (spent > limit) return "exceeded";
  if (spent === limit && limit > 0) return "reached";
  if (usagePercentage >= budgetWarningThreshold) return "warning";
  return "onTrack";
}

function addAmount(totals: Map<string, number>, categoryId: string, amount: string | number) {
  const numericAmount = normalizedAmount(amount);
  totals.set(categoryId, (totals.get(categoryId) ?? 0) + numericAmount);
}

function addSignedAmount(totals: Map<string, number>, categoryId: string, amount: number) {
  totals.set(categoryId, (totals.get(categoryId) ?? 0) + amount);
}

function normalizedAmount(amount: string | number) {
  const numericAmount = Math.abs(Number(amount));
  return Number.isFinite(numericAmount) ? numericAmount : 0;
}

function roundedMap(values: Map<string, number>) {
  return new Map([...values].map(([categoryId, amount]) => [categoryId, roundMoney(amount)]));
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundToOneDecimal(value: number) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}
