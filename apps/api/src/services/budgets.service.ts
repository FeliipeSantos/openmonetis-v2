import {
  type BudgetCreateDraft,
  type BudgetRecurringRule,
  type BudgetSpendingEntry,
  calculateBudgetOverview,
  type calculateBudgetProgress,
  calculateBudgetSpending,
  createBudgetDraft,
  getPreviousBudgetPeriod,
  resolveBudgetsForPeriod,
} from "@openmonetis/domain/budgets";
import { getPeriodEndDate } from "@openmonetis/domain/transactions";
import type {
  BudgetOutput,
  CopyPreviousBudgetsInput,
  CreateBudgetInput,
  ListBudgetsQuery,
  RemoveBudgetQuery,
  UpdateBudgetInput,
} from "@openmonetis/validators/budgets";
import { badRequest, notFound } from "../utils/errors";

type BudgetRecord = {
  id: string;
  userId: string;
  categoryId: string;
  period: string;
  amount: string;
  isRecurring: boolean;
  recurrenceEndPeriod: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type BudgetWithCategoryRecord = BudgetRecord & {
  categoryName: string;
  categoryIcon: string | null;
};

type BudgetUpdateRecord = {
  amount?: string;
  period?: string;
  isRecurring?: boolean;
  recurrenceEndPeriod?: string | null;
};

export type BudgetsRepository = {
  insertIfAbsent(data: BudgetCreateDraft): Promise<BudgetRecord | null>;
  listByUserAndPeriod(userId: string, period: string): Promise<BudgetWithCategoryRecord[]>;
  listUpToPeriodForUser(userId: string, period: string): Promise<BudgetWithCategoryRecord[]>;
  findByIdForUser(id: string, userId: string): Promise<BudgetWithCategoryRecord | null>;
  findByCategoryAndPeriodForUser(
    categoryId: string,
    period: string,
    userId: string,
  ): Promise<BudgetRecord | null>;
  updateForUser(id: string, userId: string, data: BudgetUpdateRecord): Promise<BudgetRecord | null>;
  deleteForUser(id: string, userId: string): Promise<BudgetRecord | null>;
  listSpendingEntries(userId: string, period: string): Promise<BudgetSpendingEntry[]>;
  listRecurringRules(userId: string, periodEnd: Date): Promise<BudgetRecurringRule[]>;
  insertCopies(data: BudgetCreateDraft[]): Promise<BudgetRecord[]>;
};

type BudgetCategoriesRepository = {
  findByIdForUser(
    id: string,
    userId: string,
  ): Promise<{ id: string; type: "income" | "expense" } | null>;
  listByUser(userId: string): Promise<Array<{ id: string; parentId?: string | null }>>;
};

export function createBudgetsService(
  repository: BudgetsRepository,
  categoriesRepository: BudgetCategoriesRepository,
) {
  async function expenseCategory(categoryId: string, userId: string) {
    const category = await categoriesRepository.findByIdForUser(categoryId, userId);
    if (category?.type !== "expense") {
      throw notFound("Expense category not found", "expense_category_not_found");
    }
    return category;
  }

  /** The budget of each category in `period`, including monthly ones set in earlier months. */
  async function budgetsForPeriod(userId: string, period: string) {
    return resolveBudgetsForPeriod(await repository.listUpToPeriodForUser(userId, period), period);
  }

  async function list(userId: string, query: ListBudgetsQuery) {
    const periodEnd = getPeriodEndDate(query.period);
    const [budgetRows, spendingEntries, recurringRules, categories] = await Promise.all([
      budgetsForPeriod(userId, query.period),
      repository.listSpendingEntries(userId, query.period),
      repository.listRecurringRules(userId, periodEnd),
      categoriesRepository.listByUser(userId),
    ]);
    const spending = calculateBudgetSpending(spendingEntries, recurringRules, query.period);
    const overview = calculateBudgetOverview(
      budgetRows,
      spending,
      new Map(categories.map((category) => [category.id, category.parentId ?? null])),
    );
    const items = budgetRows
      .map((budget) =>
        toOutput(
          budget,
          query.period,
          overview.progressByCategory.get(budget.categoryId) as ReturnType<
            typeof calculateBudgetProgress
          >,
        ),
      )
      .sort((left, right) => left.categoryName.localeCompare(right.categoryName, "pt-BR"));

    return {
      period: query.period,
      allocatedAmount: overview.allocatedAmount,
      actualSpentAmount: overview.actualSpentAmount,
      projectedAmount: overview.projectedAmount,
      committedAmount: overview.committedAmount,
      availableAmount: overview.availableAmount,
      exceededAmount: overview.exceededAmount,
      usagePercentage: overview.usagePercentage,
      unbudgetedCommittedAmount: overview.unbudgetedCommittedAmount,
      unbudgetedItems: overview.unbudgetedItems,
      warningCount: overview.warningCount,
      items,
    };
  }

  return {
    list,

    async get(id: string, userId: string) {
      const budget = await repository.findByIdForUser(id, userId);
      if (!budget) throw notFound("Budget not found", "budget_not_found");
      const overview = await list(userId, { period: budget.period });
      const output = overview.items.find((item) => item.id === id);
      if (!output) throw notFound("Budget not found", "budget_not_found");
      return output;
    },

    async create(input: CreateBudgetInput, userId: string) {
      await expenseCategory(input.categoryId, userId);
      const budget = await repository.insertIfAbsent(
        createBudgetDraft({
          userId,
          categoryId: input.categoryId,
          period: input.period,
          amount: input.amount,
          isRecurring: input.isRecurring,
        }),
      );
      if (!budget) {
        throw badRequest(
          "A budget already exists for this category and period",
          "budget_already_exists",
        );
      }
      const output = (await list(userId, { period: input.period })).items.find(
        (item) => item.id === budget.id,
      );
      if (!output) throw notFound("Budget not found", "budget_not_found");
      return output;
    },

    async update(id: string, userId: string, input: UpdateBudgetInput) {
      const current = await repository.findByIdForUser(id, userId);
      if (!current) throw notFound("Budget not found", "budget_not_found");
      const targetPeriod = input.period ?? current.period;
      if (targetPeriod !== current.period) {
        const existing = await repository.findByCategoryAndPeriodForUser(
          current.categoryId,
          targetPeriod,
          userId,
        );
        if (existing) {
          throw badRequest(
            "A budget already exists for this category and period",
            "budget_already_exists",
          );
        }
      }
      const values: BudgetUpdateRecord = {};
      if (input.amount !== undefined) values.amount = input.amount.toFixed(2);
      if (input.period !== undefined) values.period = input.period;
      if (input.isRecurring !== undefined) {
        values.isRecurring = input.isRecurring;
        // Turning repetition off or on again clears any earlier stop month.
        values.recurrenceEndPeriod = null;
      }
      const budget = await repository.updateForUser(id, userId, values);
      if (!budget) throw notFound("Budget not found", "budget_not_found");
      const output = (await list(userId, { period: targetPeriod })).items.find(
        (item) => item.id === id,
      );
      if (!output) throw notFound("Budget not found", "budget_not_found");
      return output;
    },

    /**
     * Removes a budget. From a later month a monthly budget repeats in, it only stops repeating
     * from that month on, keeping the earlier months.
     */
    async remove(id: string, userId: string, query: RemoveBudgetQuery = {}) {
      const current = await repository.findByIdForUser(id, userId);
      if (!current) throw notFound("Budget not found", "budget_not_found");
      if (query.fromPeriod && current.isRecurring && query.fromPeriod > current.period) {
        const stopped = await repository.updateForUser(id, userId, {
          recurrenceEndPeriod: getPreviousBudgetPeriod(query.fromPeriod),
        });
        if (!stopped) throw notFound("Budget not found", "budget_not_found");
        return { id: stopped.id };
      }
      const budget = await repository.deleteForUser(id, userId);
      if (!budget) throw notFound("Budget not found", "budget_not_found");
      return { id: budget.id };
    },

    async copyPrevious(input: CopyPreviousBudgetsInput, userId: string) {
      const [previousBudgets, targetBudgets] = await Promise.all([
        budgetsForPeriod(userId, getPreviousBudgetPeriod(input.period)),
        budgetsForPeriod(userId, input.period),
      ]);
      // A category that already has a budget in the month (a monthly one included) keeps it.
      const budgetedInTarget = new Set(targetBudgets.map((budget) => budget.categoryId));
      const selectedIds = new Set(input.sourceBudgetIds);
      const selectedBudgets = previousBudgets.filter((budget) => selectedIds.has(budget.id));
      if (selectedBudgets.length !== selectedIds.size) {
        throw badRequest("One or more source budgets are invalid", "invalid_source_budgets");
      }
      const drafts = selectedBudgets
        .filter((budget) => !budgetedInTarget.has(budget.categoryId))
        .map((budget) => ({
          userId,
          categoryId: budget.categoryId,
          period: input.period,
          amount: budget.amount,
        }));

      const createdCount = (await repository.insertCopies(drafts)).length;
      return { createdCount, skippedCount: selectedBudgets.length - createdCount };
    },
  };
}

function toOutput(
  budget: BudgetWithCategoryRecord & { inheritedFrom: string | null },
  period: string,
  progress: ReturnType<typeof calculateBudgetProgress>,
): BudgetOutput {
  return {
    id: budget.id,
    categoryId: budget.categoryId,
    categoryName: budget.categoryName,
    categoryIcon: budget.categoryIcon,
    period,
    amount: Math.abs(Number(budget.amount)),
    isRecurring: budget.isRecurring,
    inheritedFrom: budget.inheritedFrom,
    ...progress,
    createdAt: budget.createdAt.toISOString(),
    updatedAt: budget.updatedAt.toISOString(),
  };
}

export type BudgetsService = ReturnType<typeof createBudgetsService>;
