import { formatDateInBrazil, periodToSafeInstant } from "@openmonetis/shared/date-time";
import type { BudgetOutput } from "@openmonetis/validators/budgets";
import type { CategoryOutput } from "@openmonetis/validators/categories";

export const budgetStatusLabels: Record<BudgetOutput["status"], string> = {
  onTrack: "Dentro do limite",
  warning: "Atenção",
  reached: "Limite atingido",
  exceeded: "Limite excedido",
};

export const budgetStatusStyles: Record<BudgetOutput["status"], string> = {
  onTrack: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  reached: "bg-warning/10 text-warning",
  exceeded: "bg-destructive/10 text-destructive",
};

export const budgetProgressStyles: Record<BudgetOutput["status"], string> = {
  onTrack: "bg-success",
  warning: "bg-warning",
  reached: "bg-warning",
  exceeded: "bg-destructive",
};

export function formatBudgetPercentage(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
}

export function formatBudgetPeriod(period: string) {
  const label = formatDateInBrazil(periodToSafeInstant(period), {
    month: "long",
    year: "numeric",
  });
  return `${label.charAt(0).toLocaleUpperCase("pt-BR")}${label.slice(1)}`;
}

export function getBudgetWidgetItems(items: BudgetOutput[], limit?: number) {
  const sorted = [...items].sort(
    (left, right) =>
      right.usagePercentage - left.usagePercentage ||
      right.committedAmount - left.committedAmount ||
      left.categoryName.localeCompare(right.categoryName, "pt-BR"),
  );

  return limit === undefined ? sorted : sorted.slice(0, limit);
}

/** Explains what a budget for the chosen category will count. */
export function getBudgetScopeHint(
  categories: readonly Pick<CategoryOutput, "id" | "name" | "parentId" | "parentName">[],
  categoryId: string,
) {
  const category = categories.find((item) => item.id === categoryId);
  if (!category) {
    return "Escolha só a categoria para incluir todas as subcategorias, ou também uma subcategoria para limitar o orçamento a ela.";
  }
  if (category.parentId) {
    return `Considera só os lançamentos de ${category.parentName ?? ""} › ${category.name}.`;
  }
  return `Considera todos os lançamentos de ${category.name} e das suas subcategorias.`;
}

/** "Alimentação › Feira" → name "Feira" and parent "Alimentação"; a main category has no parent. */
export function splitBudgetCategoryName(label: string) {
  const separator = " › ";
  const index = label.indexOf(separator);
  if (index < 0) return { name: label, parentName: null };
  return { name: label.slice(index + separator.length), parentName: label.slice(0, index) };
}

/** "Mensal", "Mensal · desde janeiro de 2026" or "Só este mês". */
export function getBudgetRecurrenceLabel(
  budget: Pick<BudgetOutput, "isRecurring" | "inheritedFrom">,
) {
  if (!budget.isRecurring) return "Só este mês";
  return budget.inheritedFrom
    ? `Mensal · desde ${formatBudgetPeriod(budget.inheritedFrom).toLocaleLowerCase("pt-BR")}`
    : "Mensal";
}

/** What removing the budget does in the month on screen. */
export function getBudgetRemovalDescription(
  budget: Pick<BudgetOutput, "categoryName" | "isRecurring" | "inheritedFrom">,
) {
  const name = `"${budget.categoryName}"`;
  if (budget.inheritedFrom) {
    return `O limite mensal de ${name} deixa de se repetir a partir deste mês. Os meses anteriores continuam com ele e os lançamentos não serão alterados.`;
  }
  if (budget.isRecurring) {
    return `O limite mensal de ${name} será removido deste mês e dos meses seguintes em que ele se repete. Os lançamentos não serão alterados.`;
  }
  return `O limite de ${name} será removido apenas deste mês. Os lançamentos da categoria não serão alterados.`;
}
