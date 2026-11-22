import { CurrencyInput } from "@/components/ui/currency-input";

import type { useTransactionForm } from "../useTransactionForm";

import { FieldShell, FieldShellControl } from "./transaction-field-shell";
import {
  getTransactionFormErrorMessage,
  validateTransactionAmount,
} from "./transaction-form.validation";
export function TransactionAmountField({
  form,
  isSubmitting,
}: {
  form: ReturnType<typeof useTransactionForm>["form"];
  isSubmitting: boolean;
}) {
  return (
    <form.Field
      name="amount"
      validators={{ onChange: ({ value }) => validateTransactionAmount(value) }}
    >
      {(field) => (
        <FieldShell
          error={getTransactionFormErrorMessage("amount", field.state.meta.errors)}
          label="Valor"
        >
          <FieldShellControl>
            <CurrencyInput
              data-mobile-amount
              aria-invalid={field.state.meta.errors.length > 0}
              disabled={isSubmitting}
              onBlur={field.handleBlur}
              onValueChange={field.handleChange}
              placeholder="R$ 0,00"
              required
              value={field.state.value}
            />
          </FieldShellControl>
        </FieldShell>
      )}
    </form.Field>
  );
}
