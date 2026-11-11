import type { CategoryOutput, CreateCategoryInput } from "@openmonetis/validators/categories";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, LockKeyhole, Pencil, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { CardActionsMenu } from "@/components/card-actions-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  categoryGroupLabels,
  getCategoryGroups,
  getCategoryLabel,
  getSubcategoryCountLabel,
} from "../categories.presentation";
import { CategoryIcon } from "../category-icons";
import { SubcategoryForm } from "./subcategory-form";

/** Categorias principais à esquerda; ao escolher uma, as subcategorias dela aparecem à direita. */
export function CategoriesPanels({
  categories,
  type,
  search = "",
  onEdit,
  onRemove,
  onCreateCategory,
  onCreateSubcategory,
  pendingId,
}: {
  categories: CategoryOutput[];
  type: CategoryOutput["type"];
  search?: string;
  onEdit: (category: CategoryOutput) => void;
  onRemove: (category: CategoryOutput) => Promise<void>;
  onCreateCategory: () => void;
  onCreateSubcategory: (input: CreateCategoryInput) => Promise<void>;
  pendingId?: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addingParentId, setAddingParentId] = useState<string | null>(null);
  const subcategoriesRef = useRef<HTMLDivElement>(null);
  const searching = search.trim().length > 0;
  const groups = getCategoryGroups(categories, search);
  const selected =
    groups.find(({ parent }) => parent.id === selectedId) ??
    groups.find(({ parent }) => !parent.isSystem) ??
    groups[0];
  if (!selected) return null;
  const { parent, children } = selected;
  const adding = addingParentId === parent.id;

  function select(id: string) {
    setSelectedId(id);
    setAddingParentId(null);
    // Below `lg` the subcategories panel sits under the whole list, so bring it into view.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() =>
        subcategoriesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  }

  return (
    <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
      <Card className="min-w-0 gap-0 p-3 sm:p-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2 px-2 pb-3">
          <h2 className="min-w-48 flex-1 break-words font-semibold">
            Categorias de {categoryGroupLabels[type]}
          </h2>
          <Button onClick={onCreateCategory} size="sm" variant="outline">
            <Plus aria-hidden="true" className="size-4" />
            Nova categoria
          </Button>
        </div>
        <ul aria-label={`Categorias de ${categoryGroupLabels[type]}`}>
          {groups.map((group) => {
            const active = group.parent.id === parent.id;
            return (
              <li
                className={cn(
                  "flex min-w-0 items-center gap-2 rounded-md border-l-2 border-transparent px-2 hover:bg-muted/50 focus-within:bg-muted/50",
                  active && "border-brand-strong bg-muted/50",
                )}
                key={group.parent.id}
              >
                <button
                  aria-pressed={active}
                  className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-md py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => select(group.parent.id)}
                  type="button"
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground",
                      active && "text-brand-strong",
                    )}
                  >
                    <CategoryIcon className="size-4" name={group.parent.icon} />
                  </span>
                  <span className="grid min-w-0">
                    <span className="truncate font-medium">{group.parent.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {getSubcategoryCountLabel(group.children.length, searching)}
                    </span>
                  </span>
                </button>
                <CategoryActions
                  category={group.parent}
                  onEdit={onEdit}
                  onRemove={onRemove}
                  pending={pendingId === group.parent.id}
                />
              </li>
            );
          })}
        </ul>
      </Card>
      <Card
        className="min-w-0 scroll-mt-4 gap-0 p-3 sm:p-4 lg:sticky lg:top-4"
        ref={subcategoriesRef}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2 px-2 pb-3">
          <h2 className="min-w-48 flex-1 break-words font-semibold">
            Subcategorias de {parent.name}
          </h2>
          <Link
            className={buttonVariants({ size: "sm", variant: "ghost" })}
            params={{ categoryId: parent.id }}
            to="/categories/$categoryId"
          >
            Lançamentos
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
          {!parent.isSystem ? (
            <Button
              disabled={adding}
              onClick={() => setAddingParentId(parent.id)}
              size="sm"
              variant="outline"
            >
              <Plus aria-hidden="true" className="size-4" />
              Nova subcategoria
            </Button>
          ) : null}
        </div>
        {adding ? (
          <div className="px-2 pb-3">
            <SubcategoryForm
              key={parent.id}
              parent={parent}
              onCancel={() => setAddingParentId(null)}
              onSubmit={onCreateSubcategory}
            />
          </div>
        ) : null}
        {children.length ? (
          <ul aria-label={`Subcategorias de ${parent.name}`} className="[&_a]:no-underline">
            {children.map((child) => (
              <li
                className="flex min-w-0 items-center gap-2 rounded-md px-2 hover:bg-muted/50 focus-within:bg-muted/50"
                key={child.id}
              >
                <Link
                  className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-md py-2 text-sm hover:text-brand-strong outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  params={{ categoryId: child.id }}
                  to="/categories/$categoryId"
                  aria-label={getCategoryLabel(child)}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                    <CategoryIcon className="size-4" name={child.icon ?? parent.icon} />
                  </span>
                  <span className="min-w-0 break-words font-medium">{child.name}</span>
                </Link>
                <CategoryActions
                  category={child}
                  onEdit={onEdit}
                  onRemove={onRemove}
                  pending={pendingId === child.id}
                />
              </li>
            ))}
          </ul>
        ) : adding ? null : (
          <div className="grid min-h-40 place-items-center p-6 text-center">
            <p className="text-muted-foreground text-sm">
              {parent.isSystem
                ? "Categoria criada pelo sistema, sem subcategorias."
                : searching
                  ? "Nenhuma subcategoria encontrada nesta busca."
                  : "Nenhuma subcategoria cadastrada."}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

function CategoryActions({
  category,
  onEdit,
  onRemove,
  pending,
}: {
  category: CategoryOutput;
  onEdit: (category: CategoryOutput) => void;
  onRemove: (category: CategoryOutput) => Promise<void>;
  pending: boolean;
}) {
  if (category.isSystem)
    return (
      <Tooltip>
        <TooltipTrigger
          aria-label={`Por que ${category.name} é automática?`}
          render={<Button variant="ghost" size="icon" />}
        >
          <LockKeyhole aria-hidden="true" className="size-4 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent>
          Criada pelo sistema. Esta categoria não pode ser editada ou removida.
        </TooltipContent>
      </Tooltip>
    );
  return <EditableCategoryActions {...{ category, onEdit, onRemove, pending }} />;
}

function EditableCategoryActions({
  category,
  onEdit,
  onRemove,
  pending,
}: {
  category: CategoryOutput;
  onEdit: (category: CategoryOutput) => void;
  onRemove: (category: CategoryOutput) => Promise<void>;
  pending: boolean;
}) {
  const [removeOpen, setRemoveOpen] = useState(false);
  const label = getCategoryLabel(category);

  return (
    <>
      <CardActionsMenu className="ml-0" disabled={pending} label={`Mais ações para ${label}`}>
        <DropdownMenuItem onClick={() => onEdit(category)}>
          <Pencil aria-hidden="true" /> Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setRemoveOpen(true)} variant="destructive">
          <Trash2 aria-hidden="true" /> Remover
        </DropdownMenuItem>
      </CardActionsMenu>
      <RemoveCategoryDialog
        category={category}
        onOpenChange={setRemoveOpen}
        onRemove={onRemove}
        open={removeOpen}
        pending={pending}
      />
    </>
  );
}

function RemoveCategoryDialog({
  category,
  onOpenChange,
  onRemove,
  open,
  pending,
}: {
  category: CategoryOutput;
  onOpenChange: (open: boolean) => void;
  onRemove: (category: CategoryOutput) => Promise<void>;
  open: boolean;
  pending: boolean;
}) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {category.parentId ? "Remover subcategoria?" : "Remover categoria?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            A categoria &quot;{category.name}&quot; será removida. Se ela estiver vinculada a
            lançamentos ou recorrências, altere a categoria desses registros antes de excluir.
            Orçamentos vinculados também precisam ser removidos primeiro. Categorias com
            subcategorias só podem ser removidas depois de mover ou excluir suas filhas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() => {
              void onRemove(category).then(() => onOpenChange(false));
            }}
            variant="destructive"
          >
            {pending ? "Removendo..." : "Remover"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
