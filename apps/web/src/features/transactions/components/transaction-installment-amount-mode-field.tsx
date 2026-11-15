import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { installmentAmountModeOptions } from "../transactions.presentation";
import type { useTransactionForm } from "../useTransactionForm";
import { FieldShell } from "./transaction-field-shell";
import type { TransactionFormValues } from "./transaction-form.validation";

/** Whether the typed amount of a new installment purchase is its total or each installment. */
export function TransactionInstallmentAmountModeField({
  form,
  isSubmitting,
}: {
  form: ReturnType<typeof useTransactionForm>["form"];
  isSubmitting: boolean;
}) {
  return (
    <form.Field name="installmentAmountMode">
      {(field) => (
        <FieldShell label="O valor informado é">
          <ToggleGroup
            aria-label="O valor informado é"
            className="grid w-full grid-cols-2 rounded-lg bg-muted p-1"
            disabled={isSubmitting}
            onValueChange={(value) => {
              const mode = value[0] as TransactionFormValues["installmentAmountMode"] | undefined;
              if (mode) field.handleChange(mode);
            }}
            spacing={1}
            value={[field.state.value]}
          >
            {installmentAmountModeOptions.map((option) => (
              <ToggleGroupItem
                className="h-8 rounded-md px-3 text-muted-foreground text-sm hover:text-foreground data-pressed:bg-background data-pressed:font-medium data-pressed:text-foreground data-pressed:shadow-xs"
                key={option.value}
                value={option.value}
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </FieldShell>
      )}
    </form.Field>
  );
}
