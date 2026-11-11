import { z } from "@hono/zod-openapi";
import { categoryTypes } from "@openmonetis/domain/categories";

export { categoryTypes } from "@openmonetis/domain/categories";

export const CreateCategoryInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    type: z.enum(categoryTypes),
    icon: z.string().trim().min(1).max(100).nullable().optional(),
    parentId: z.uuid().nullable().optional(),
  })
  .openapi("CreateCategoryInput");

export const ReplaceCategoryInputSchema = CreateCategoryInputSchema.openapi("ReplaceCategoryInput");
export const UpdateCategoryInputSchema = CreateCategoryInputSchema.partial()
  .refine((input) => Object.keys(input).length > 0, "Provide at least one field to update")
  .openapi("UpdateCategoryInput");
export const CategoryParamsSchema = z
  .object({ id: z.uuid().openapi({ param: { name: "id", in: "path" } }) })
  .openapi("CategoryParams");
export const CategoryOutputSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    type: z.enum(categoryTypes),
    icon: z.string().nullable(),
    isSystem: z.boolean(),
    parentId: z.uuid().nullable().optional(),
    parentName: z.string().nullable().optional(),
    position: z.number().int().nonnegative(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi("CategoryOutput");

/** The new order of one level: every category with this type and parent, first to last. */
export const ReorderCategoriesInputSchema = z
  .object({
    type: z.enum(categoryTypes),
    parentId: z.uuid().nullable(),
    ids: z.array(z.uuid()).min(1).max(500),
  })
  .openapi("ReorderCategoriesInput");

export type CreateCategoryInput = z.infer<typeof CreateCategoryInputSchema>;
export type ReorderCategoriesInput = z.infer<typeof ReorderCategoriesInputSchema>;
export type ReplaceCategoryInput = z.infer<typeof ReplaceCategoryInputSchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategoryInputSchema>;
export type CategoryOutput = z.infer<typeof CategoryOutputSchema>;
