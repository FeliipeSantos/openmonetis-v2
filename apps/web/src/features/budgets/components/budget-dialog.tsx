import type {
  BudgetOutput,
  CreateBudgetInput,
  UpdateBudgetInput,
} from "@openmonetis/validators/budgets";
import { CreateBudgetInputSchema, UpdateBudgetInputSchema } from "@openmonetis/validators/budgets";
import type { CategoryOutput } from "@openmonetis/validators/categories";
import { useForm } from "@tanstack/react-form";
import { useId, useState } from "react";
import { MobileFormContent as DialogContent } from "@/components/forms/mobile-form-content";
import { MobileFormDialog as Dialog } from "@/components/forms/mobile-form-dialog";
import { MobileFormState } from "@/components/forms/mobile-form-state";
import { PeriodPicker } from "@/components/period-picker";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CategoryIcon } from "@/features/categories/category-icons";
import { CategoryPicker } from "@/features/categories/components/category-picker";
import { SubcategoryPicker } from "@/features/categories/components/subcategory-picker";
import { showInvalidFormToast } from "@/lib/form-feedback";
import { cn } from "@/lib/utils";
import { formatBudgetPeriod, getBudgetScopeHint } from "../budgets.presentation";

type BudgetDialogProps = {
  budget: BudgetOutput | null;
  initialCategoryId?: string;
  categories: CategoryOutput[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateBudgetInput | UpdateBudgetInput) => Promise<void>;
  open: boolean;
  period: string;
};

export function BudgetDialog({
  budget,
  initialCategoryId,
  categories,
  onOpenChange,
  onSubmit,
  open,
  period,
}: BudgetDialogProps) {
  const id = useId();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const editing = Boolean(budget);
  // A monthly budget from an earlier month is changed from the month on screen on.
  const inherited = Boolean(budget?.inheritedFrom);
  const form = useForm({
    defaultValues: {
      categoryId: budget?.categoryId ?? initialCategoryId ?? "",
      amount: budget ? String(budget.amount) : "",
      period: budget?.period ?? period,
      isRecurring: budget?.isRecurring ?? false,
    },
    onSubmitInvalid: showInvalidFormToast,
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      const amount = Number(value.amount);
      const result = editing
        ? UpdateBudgetInputSchema.safeParse({
            amount,
            period: value.period,
            isRecurring: value.isRecurring,
          })
        : CreateBudgetInputSchema.safeParse({
            categoryId: value.categoryId,
            period: value.period,
            amount,
            isRecurring: value.isRecurring,
          });

      if (!result.success) {
        showInvalidFormToast();
        return;
      }

      try {
        await onSubmit(result.data);
        onOpenChange(false);
      } catch {
        setSubmitError(
          editing
            ? "Não foi possível atualizar. A categoria pode já possuir um orçamento no mês escolhido."
            : "Não foi possível criar. A categoria pode já possuir um orçamento neste mês.",
        );
      }
    },
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent guarded>
        <DialogHeader>
          <DialogTitle>{editing ? "Atualizar orçamento" : "Novo orçamento"}</DialogTitle>
          <DialogDescription>
            {inherited
              ? "Este limite se repete de um mês anterior. O que você mudar vale a partir deste mês."
              : editing
                ? "Ajuste o limite mensal desta categoria."
                : "Defina quanto pretende gastar nesta categoria durante o mês."}
          </DialogDescription>
        </DialogHeader>

        <form
          data-mobile-page-form
          className="grid gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Subscribe
            selector={(state) => ({
              isDirty: !state.isDefaultValue,
              isSubmitting: state.isSubmitting,
            })}
          >
            {(state) => <MobileFormState {...state} />}
          </form.Subscribe>
          <form.Field
            name="categoryId"
            validators={{
              onSubmit: ({ value }) => (value ? undefined : "Selecione a categoria."),
            }}
          >
            {(field) =>
              editing && budget ? (
                <div className="grid gap-1.5">
                  <Label className="font-mono" htmlFor={`${id}-category`}>
                    Categoria de despesa
                  </Label>
                  <output
                    className="flex h-9 items-center gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm"
                    id={`${id}-category`}
                  >
                    <CategoryIcon
                      className="size-4 text-muted-foreground"
                      name={budget.categoryIcon}
                    />
                    <span>{budget.categoryName}</span>
                  </output>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid content-start gap-1.5">
                    <span className="font-mono text-sm font-medium">Categoria de despesa</span>
                    <CategoryPicker
                      allowEmpty={false}
                      categories={categories}
                      invalid={field.state.meta.errors.length > 0}
                      onChange={field.handleChange}
                      placeholder="Selecione"
                      rootsOnly
                      value={field.state.value}
                    />
                    {field.state.meta.errors[0] ? (
                      <p className="text-destructive text-xs" role="alert">
                        {String(field.state.meta.errors[0])}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid content-start gap-1.5">
                    <span className="font-mono text-sm font-medium">Subcategoria</span>
                    <SubcategoryPicker
                      categories={categories}
                      noneLabel="Todas as subcategorias"
                      onChange={field.handleChange}
                      value={field.state.value}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs sm:col-span-2">
                    {getBudgetScopeHint(categories, field.state.value)}
                  </p>
                </div>
              )
            }
          </form.Field>

          <form.Field name="period">
            {(field) => (
              <div className="grid gap-1.5">
                <Label className="font-mono" htmlFor={`${id}-period`}>
                  Mês do orçamento
                </Label>
                {inherited ? (
                  <output
                    className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm"
                    id={`${id}-period`}
                  >
                    {formatBudgetPeriod(field.state.value)}
                  </output>
                ) : (
                  <PeriodPicker
                    id={`${id}-period`}
                    onChange={field.handleChange}
                    value={field.state.value}
                  />
                )}
                <p className="text-muted-foreground text-xs">
                  {inherited
                    ? "A mudança começa neste mês; os meses anteriores continuam como estão."
                    : "Pré-selecionada conforme o mês da tela."}
                </p>
              </div>
            )}
          </form.Field>

          <form.Field
            name="amount"
            validators={{
              onBlur: ({ value }) =>
                CreateBudgetInputSchema.shape.amount.safeParse(Number(value)).success
                  ? undefined
                  : "Informe um limite maior que zero.",
            }}
          >
            {(field) => (
              <div className="grid gap-1.5">
                <Label className="font-mono" htmlFor={`${id}-amount`}>
                  Limite mensal
                </Label>
                <CurrencyInput
                  aria-invalid={field.state.meta.errors.length > 0}
                  id={`${id}-amount`}
                  onBlur={field.handleBlur}
                  onValueChange={field.handleChange}
                  placeholder="R$ 0,00"
                  value={field.state.value}
                />
                {field.state.meta.errors[0] ? (
                  <p className="sr-only" role="alert">
                    {field.state.meta.errors[0]}
                  </p>
                ) : null}
              </div>
            )}
          </form.Field>

          <form.Field name="isRecurring">
            {(field) => (
              <section
                className={cn(
                  "flex items-center justify-between gap-4 rounded-lg border border-input bg-popover px-3 py-2.5 transition-colors",
                  field.state.value && "border-brand/30 bg-brand/5",
                )}
              >
                <label className="min-w-0 cursor-pointer" htmlFor={`${id}-recurring`}>
                  <span className="block text-left font-medium text-sm">Mensal</span>
                  <span className="block text-left text-muted-foreground text-xs">
                    Repete este limite nos meses seguintes, sem precisar cadastrar de novo.
                  </span>
                </label>
                <Switch
                  checked={field.state.value}
                  id={`${id}-recurring`}
                  onCheckedChange={(checked) => field.handleChange(checked)}
                />
              </section>
            )}
          </form.Field>

          {submitError ? (
            <p className="text-destructive text-sm" role="alert">
              {submitError}
            </p>
          ) : null}

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(submitting) => (
              <div data-mobile-form-actions className="grid w-full grid-cols-2 gap-2 [&>*]:w-full">
                <Button
                  data-mobile-cancel
                  disabled={submitting}
                  onClick={() => onOpenChange(false)}
                  type="button"
                  variant="outline"
                >
                  Cancelar
                </Button>
                <Button disabled={submitting} type="submit">
                  {submitting ? "Salvando..." : editing ? "Atualizar" : "Salvar"}
                </Button>
              </div>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}
