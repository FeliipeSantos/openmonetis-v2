import type { PaidInvoiceChargeAction } from "@openmonetis/domain/invoices";
import { CircleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatPaidInvoicePeriod } from "../transactions.presentation";

/**
 * Asks how to save a card charge on an invoice already paid: as paid (also paid from the account
 * last used for that invoice) or as pending (the invoice reopens with the new amount due).
 */
export function TransactionPaidInvoiceDialog({
  invoicePeriod,
  onChoose,
  onOpenChange,
  open,
  pending,
}: {
  invoicePeriod: string | null | undefined;
  onChoose: (action: PaidInvoiceChargeAction) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  pending: boolean;
}) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <CircleAlert aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Essa fatura já está paga</AlertDialogTitle>
          <AlertDialogDescription className="grid gap-3">
            <span>
              {invoicePeriod
                ? `A fatura de ${formatPaidInvoicePeriod(invoicePeriod)} já foi paga.`
                : "A fatura selecionada já foi paga."}
            </span>
            <span>
              Ao salvar essa despesa como paga, ela será descontada da última conta utilizada no
              pagamento dessa fatura e os saldos serão recalculados.
            </span>
            <span>Caso salve como pendente, a fatura será reaberta com esse valor a ser pago.</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            disabled={pending}
            onClick={() => onChoose("reopen")}
            type="button"
            variant="outline"
          >
            Salvar como pendente
          </Button>
          <Button disabled={pending} onClick={() => onChoose("pay")} type="button">
            Salvar como paga
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
