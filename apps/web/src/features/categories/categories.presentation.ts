import type { BudgetOutput } from "@openmonetis/validators/budgets";
import type { CategoryOutput } from "@openmonetis/validators/categories";
import { ApiClientError } from "../../lib/api-client";

export function getCategoryLabel(category: Pick<CategoryOutput, "name" | "parentName">) {
  return category.parentName ? `${category.parentName} › ${category.name}` : category.name;
}

export function getCategoryGroups(categories: readonly CategoryOutput[], search = "") {
  const query = search.trim().toLocaleLowerCase("pt-BR");
  const matches = (name: string) => name.toLocaleLowerCase("pt-BR").includes(query);
  return categories
    .filter((category) => !category.parentId)
    .sort(compareCategories)
    .map((parent) => ({
      parent,
      children: categories
        .filter(
          (child) => child.parentId === parent.id && (matches(parent.name) || matches(child.name)),
        )
        .sort(compareCategories),
    }))
    .filter((group) => matches(group.parent.name) || group.children.length > 0);
}

export type CategoryMonthSummary = { amount: number; budget: BudgetOutput | null };

/** Indexes the month totals and budgets the API already computed by category id. */
export function getCategoryMonthSummaries(
  totals: readonly { categoryId: string; amount: number }[],
  budgets: readonly BudgetOutput[],
) {
  const summaries = new Map<string, CategoryMonthSummary>();
  for (const total of totals)
    summaries.set(total.categoryId, { amount: total.amount, budget: null });
  for (const budget of budgets) {
    summaries.set(budget.categoryId, {
      amount: summaries.get(budget.categoryId)?.amount ?? 0,
      budget,
    });
  }
  return summaries;
}

export function sortCategoryOptions<
  T extends { name: string; parentId?: string | null; parentName?: string | null },
>(categories: readonly T[]) {
  return [...categories].sort(
    (left, right) =>
      (left.parentName ?? left.name).localeCompare(right.parentName ?? right.name, "pt-BR") ||
      Number(Boolean(left.parentId)) - Number(Boolean(right.parentId)) ||
      left.name.localeCompare(right.name, "pt-BR"),
  );
}

/** The order chosen by dragging on the categories screen, then the name. */
function compareCategories(left: CategoryOutput, right: CategoryOutput) {
  return left.position - right.position || left.name.localeCompare(right.name, "pt-BR");
}

/**
 * Moves one category to where another one is, within the same level, and returns the ids of that
 * level in their new order. Returns null when the move changes nothing or crosses levels.
 */
export function moveCategory(
  categories: readonly CategoryOutput[],
  activeId: string,
  overId: string,
) {
  const active = categories.find((category) => category.id === activeId);
  const over = categories.find((category) => category.id === overId);
  if (!active || !over || activeId === overId) return null;
  if (active.type !== over.type || (active.parentId ?? null) !== (over.parentId ?? null)) {
    return null;
  }
  const level = categories
    .filter(
      (category) =>
        category.type === active.type && (category.parentId ?? null) === (active.parentId ?? null),
    )
    .sort(compareCategories)
    .map((category) => category.id);
  const from = level.indexOf(activeId);
  const to = level.indexOf(overId);
  level.splice(to, 0, ...level.splice(from, 1));
  return level;
}

/** The categories with each id of `orderedIds` placed at its index, for an optimistic update. */
export function applyCategoryOrder(
  categories: readonly CategoryOutput[],
  orderedIds: readonly string[],
) {
  const positions = new Map(orderedIds.map((id, index) => [id, index]));
  return categories.map((category) =>
    positions.has(category.id)
      ? { ...category, position: positions.get(category.id) as number }
      : category,
  );
}

export function getCategoryErrorMessage(error: unknown, operation: "save" | "remove" = "save") {
  if (error instanceof ApiClientError) {
    if (error.code === "category_name_conflict")
      return "Já existe uma categoria com esse nome neste grupo.";
    if (error.code === "category_has_children")
      return "Mova ou remova as subcategorias antes de alterar o grupo.";
    if (error.code === "category_invalid_parent")
      return "Escolha uma categoria principal do mesmo tipo.";
    if (error.code === "category_type_in_use")
      return "O tipo de uma categoria em uso não pode ser alterado.";
    if (error.code === "category_in_use")
      return "Categoria em uso. Altere os lançamentos e remova os orçamentos vinculados antes de excluir.";
  }
  return operation === "remove"
    ? "Não foi possível remover a categoria. Tente novamente."
    : "Não foi possível salvar a categoria. Tente novamente.";
}
export const categoryTypeLabels: Record<CategoryOutput["type"], string> = {
  income: "Receita",
  expense: "Despesa",
};

export const categoryGroupLabels: Record<CategoryOutput["type"], string> = {
  income: "receitas",
  expense: "despesas",
};

/**
 * For a category id, the main category it belongs to, the chosen subcategory (if any) and the
 * subcategories of that main category matching `search`, sorted by name.
 */
export function getSubcategoryOptions(
  categories: readonly CategoryOutput[],
  value: string,
  search = "",
) {
  const current = categories.find((category) => category.id === value);
  const parent = current?.parentId
    ? categories.find((category) => category.id === current.parentId)
    : current;
  const selected = current?.parentId ? current : undefined;
  const query = search.trim().toLocaleLowerCase("pt-BR");
  const options = parent
    ? categories
        .filter(
          (category) =>
            category.parentId === parent.id &&
            category.name.toLocaleLowerCase("pt-BR").includes(query),
        )
        .sort(compareCategories)
    : [];
  return { parent, selected, options };
}

/** The main category of a category id: itself when it is a main category. */
export function getMainCategoryId(
  categories: readonly Pick<CategoryOutput, "id" | "parentId">[],
  categoryId: string,
) {
  const category = categories.find((item) => item.id === categoryId);
  return category ? (category.parentId ?? category.id) : undefined;
}

export const missingCategoryMessage = "Selecione a categoria e a subcategoria.";
export const missingSubcategoryMessage = "Selecione uma subcategoria.";

/**
 * A transaction is saved with a subcategory whenever its category has one: nothing chosen (or a
 * category that no longer exists) is missing both, and a main category with subcategories is
 * missing the subcategory. A main category without subcategories, such as the system ones, is
 * accepted as it is.
 */
export function getCategorySelectionError(
  categories: readonly Pick<CategoryOutput, "id" | "parentId">[],
  categoryId: string,
) {
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return missingCategoryMessage;
  if (category.parentId) return undefined;
  return categories.some((item) => item.parentId === category.id)
    ? missingSubcategoryMessage
    : undefined;
}

/** Shown under Subcategoria when the chosen category has none to pick. */
export const noSubcategoriesNotice = "Esta categoria não tem subcategorias e será salva sem uma.";

export function getSubcategoryPlaceholder(
  parent: CategoryOutput | undefined,
  hasSubcategories: boolean,
) {
  if (!parent) return "Escolha a categoria";
  return hasSubcategories ? "Sem subcategoria" : "Sem subcategorias";
}

export function getSubcategoryCountLabel(count: number, searching = false) {
  const label =
    count === 0
      ? "Sem subcategorias"
      : `${count} ${count === 1 ? "subcategoria" : "subcategorias"}`;
  return searching && count > 0 ? `${label} na busca` : label;
}
