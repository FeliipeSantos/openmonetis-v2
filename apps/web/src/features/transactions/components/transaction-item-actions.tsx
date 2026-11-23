import { balanceAdjustmentCategoryName } from "@openmonetis/domain/categories";
import { canDeleteTransactionOrigin } from "@openmonetis/domain/transactions";
import type { TransactionOutput } from "@openmonetis/validators/transactions";
import { useState } from "react";
import { TransactionActionDialogs } from "./transaction-action-dialogs";
import { TransactionRowActions } from "./transaction-row-actions";
import type { TransactionsTableProps } from "./transactions-table.types";

/** The listing's row actions, for screens that show transactions outside the table. */
export type TransactionItemActionHandlers = Pick<
  TransactionsTableProps,
  | "pendingTransactionId"
  | "onEdit"
  | "onView"
  | "onDelete"
  | "onCopy"
  | "onAnticipate"
  | "onUndoAnticipation"
  | "onRefund"
  | "onRecurringAction"
>;

/**
 * The same actions menu and confirmations as a table row, opened by clicking the whole item: the
 * trigger covers its positioned parent, so the item's content must sit above it without pointer
 * events (links inside it opt back in).
 */
export function TransactionItemActions({
  actions,
  transaction,
}: {
  actions: TransactionItemActionHandlers;
  transaction: TransactionOutput;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [installmentDeleteOpen, setInstallmentDeleteOpen] = useState(false);
  const [recurringAction, setRecurringAction] = useState<"pause" | "stop" | "skip" | null>(null);
  const pending =
    actions.pendingTransactionId !== null && actions.pendingTransactionId === transaction.recordId;
  const isInvoiceAdjustment = transaction.origin === "invoiceAdjustment";
  const isBalanceAdjustment =
    transaction.categoryName === balanceAdjustmentCategoryName ||
    transaction.paymentMethod === null;
  const isRefund = transaction.origin === "refund";

  return (
    <>
      <TransactionRowActions
        canDelete={isInvoiceAdjustment || canDeleteTransactionOrigin(transaction.origin)}
        isBalanceAdjustment={isBalanceAdjustment}
        isGenerated={transaction.origin !== "regular"}
        isInvoiceAdjustment={isInvoiceAdjustment}
        isRefund={isRefund}
        onAnticipate={actions.onAnticipate}
        onCopy={actions.onCopy}
        onEdit={actions.onEdit}
        onRefund={actions.onRefund}
        onUndoAnticipation={actions.onUndoAnticipation}
        onView={actions.onView}
        pending={pending}
        setDeleteOpen={setDeleteOpen}
        setInstallmentDeleteOpen={setInstallmentDeleteOpen}
        setRecurringAction={setRecurringAction}
        transaction={transaction}
        trigger={
          <button
            aria-label={`Ações de ${transaction.name}`}
            className="absolute inset-0 cursor-pointer outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-default data-[popup-open]:bg-foreground/5"
            disabled={pending}
            type="button"
          />
        }
      />
      <TransactionActionDialogs
        deleteOpen={deleteOpen}
        installmentDeleteOpen={installmentDeleteOpen}
        isBalanceAdjustment={isBalanceAdjustment}
        isInvoiceAdjustment={isInvoiceAdjustment}
        isRefund={isRefund}
        onDelete={actions.onDelete}
        onRecurringAction={actions.onRecurringAction}
        pending={pending}
        recurringAction={recurringAction}
        setDeleteOpen={setDeleteOpen}
        setInstallmentDeleteOpen={setInstallmentDeleteOpen}
        setRecurringAction={setRecurringAction}
        transaction={transaction}
      />
    </>
  );
}
