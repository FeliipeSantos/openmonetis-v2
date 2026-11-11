import type { ReplaceCategoryInput } from "@openmonetis/validators/categories";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { refreshFinancialQueries } from "@/lib/financial-query-invalidation";
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  replaceCategory,
} from "./categories.api";
import { applyCategoryOrder } from "./categories.presentation";
import { categoriesQueryOptions } from "./categories.queries";
export function useCreateCategoryMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: (category) => {
      client.setQueryData(categoriesQueryOptions().queryKey, (current) =>
        current ? [...current.filter((item) => item.id !== category.id), category] : [category],
      );
      return refreshFinancialQueries(client);
    },
  });
}
export function useReplaceCategoryMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReplaceCategoryInput }) =>
      replaceCategory(id, input),
    onSuccess: () => refreshFinancialQueries(client),
  });
}
/** Saves a dragged order, showing it right away and restoring the previous one on failure. */
export function useReorderCategoriesMutation() {
  const client = useQueryClient();
  const queryKey = categoriesQueryOptions().queryKey;
  return useMutation({
    mutationFn: reorderCategories,
    onMutate: async (input) => {
      await client.cancelQueries({ queryKey });
      const previous = client.getQueryData(queryKey);
      client.setQueryData(queryKey, (current) =>
        current ? applyCategoryOrder(current, input.ids) : current,
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) client.setQueryData(queryKey, context.previous);
    },
    onSettled: () => client.invalidateQueries({ queryKey }),
  });
}
export function useDeleteCategoryMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => refreshFinancialQueries(client),
  });
}
