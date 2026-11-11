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

function compareCategories(left: CategoryOutput, right: CategoryOutput) {
  return left.name.localeCompare(right.name, "pt-BR");
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
