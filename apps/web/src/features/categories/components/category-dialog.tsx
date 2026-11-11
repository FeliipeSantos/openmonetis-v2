import type {
  CategoryOutput,
  CreateCategoryInput,
  ReplaceCategoryInput,
} from "@openmonetis/validators/categories";
import { MobileFormContent as DialogContent } from "@/components/forms/mobile-form-content";
import { MobileFormDialog as Dialog } from "@/components/forms/mobile-form-dialog";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategoryForm } from "./category-form";
export function CategoryDialog({
  category,
  defaultType,
  defaultParentId,
  lockType,
  onOpenChange,
  onSubmit,
  open,
}: {
  category: CategoryOutput | null;
  defaultType?: CreateCategoryInput["type"];
  defaultParentId?: string;
  lockType?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateCategoryInput | ReplaceCategoryInput) => Promise<void>;
  open: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent guarded>
        <DialogHeader>
          <DialogTitle>
            {category
              ? "Atualizar categoria"
              : defaultParentId
                ? "Nova subcategoria"
                : "Nova categoria"}
          </DialogTitle>
          <DialogDescription>
            {category
              ? "Atualize os detalhes da categoria."
              : defaultParentId
                ? "Crie uma subcategoria dentro da categoria escolhida."
                : "Crie uma categoria para organizar seus lançamentos."}
          </DialogDescription>
        </DialogHeader>
        <CategoryForm
          key={
            category?.id ?? `new-category-${defaultType ?? "default"}-${defaultParentId ?? "root"}`
          }
          category={category}
          defaultType={defaultType}
          defaultParentId={defaultParentId}
          lockType={lockType}
          onCancel={() => onOpenChange(false)}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
