import type { CardOutput } from "@openmonetis/validators/cards";
import type { CardInvoiceTotalOutput } from "@openmonetis/validators/transactions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import {
  ChevronRight,
  Circle,
  CircleAlert,
  CircleCheck,
  CreditCard,
  Loader2,
  Lock,
  type LucideIcon,
  ReceiptText,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { MoneyValue } from "@/components/money-value";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getCardBrandAsset } from "@/features/cards/card-brand-assets";
import { cardBrandLabels, cardInvoiceStatusLabels } from "@/features/cards/cards.presentation";
import { cardsQueryOptions } from "@/features/cards/cards.queries";
import { InvoicePaymentDialog } from "@/features/invoices/components/invoice-payment-dialog";
import { invoicesQueryOptions } from "@/features/invoices/invoices.queries";
import { cn } from "@/lib/utils";
import { formatCardInvoiceTotalDetail, formatCompactDate } from "../transactions.presentation";
import { CardInvoiceStatementDialog } from "./transaction-card-invoice-statement-dialog";

function CardInvoiceLogo({ invoice }: { invoice: CardInvoiceTotalOutput }) {
  return invoice.cardLogo ? (
    <Image
      alt=""
      className="size-8 shrink-0 rounded-full object-contain"
      height={32}
      layout="fixed"
      src={invoice.cardLogo}
      width={32}
    />
  ) : (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted">
      <CreditCard aria-hidden="true" className="size-4" />
    </span>
  );
}

type InvoiceStatus = CardOutput["invoiceSummary"]["status"];

const statusIcons: Record<InvoiceStatus, LucideIcon> = {
  open: Circle,
  closed: Lock,
  overdue: CircleAlert,
  paid: CircleCheck,
};

const statusClassNames: Record<InvoiceStatus, string> = {
  open: "text-muted-foreground",
  closed: "text-foreground",
  overdue: "text-destructive",
  paid: "text-success",
};

/** The card and its invoice summary (status, due date) for the invoice's period. */
function useInvoiceCard(invoice: CardInvoiceTotalOutput) {
  const cardsQuery = useQuery(cardsQueryOptions(invoice.period));
  const card = cardsQuery.data?.find((item) => item.id === invoice.cardId);
  const summary = card?.invoiceSummary.period === invoice.period ? card.invoiceSummary : undefined;
  const payable = card?.status === "active" && (summary?.remainingAmount ?? 0) > 0;
  return { brand: card?.brand, payable, summary };
}

/** Card name followed by its network flag (Visa, Mastercard…), when known. */
function CardInvoiceName({
  brand,
  className,
  name,
}: {
  brand: CardOutput["brand"] | undefined;
  className: string;
  name: string;
}) {
  const brandAsset = brand ? getCardBrandAsset(brand) : null;

  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className={className}>{name}</span>
      {brand && brandAsset ? (
        <Image
          alt={cardBrandLabels[brand]}
          className="h-4 w-auto shrink-0 object-contain"
          height={16}
          layout="fixed"
          src={brandAsset}
          width={32}
        />
      ) : null}
    </span>
  );
}

type InvoiceSummary = CardOutput["invoiceSummary"];

/**
 * The listed total and, once part of the invoice was paid (e.g. an early payment), what is still
 * due on it, signed like the total.
 */
function CardInvoiceAmount({
  className,
  invoice,
  summary,
}: {
  className: string;
  invoice: CardInvoiceTotalOutput;
  summary: InvoiceSummary | undefined;
}) {
  const partlyPaid = summary !== undefined && summary.paidAmount > 0 && summary.remainingAmount > 0;

  return (
    <span className="grid justify-items-end">
      <MoneyValue amount={invoice.amount} className={className} />
      {partlyPaid ? (
        <span
          className="inline-flex items-baseline gap-1 text-muted-foreground text-xs"
          title="Valor que ainda falta pagar da fatura"
        >
          Fatura
          <MoneyValue amount={-summary.remainingAmount} className="font-medium" />
        </span>
      ) : null}
    </span>
  );
}

/** "12 lançamentos · Venc. qui, 10 de dez". */
function CardInvoiceDetail({
  dueDate,
  invoice,
}: {
  dueDate: string | undefined;
  invoice: CardInvoiceTotalOutput;
}) {
  return (
    <span className="truncate text-muted-foreground text-xs">
      {formatCardInvoiceTotalDetail(invoice)}
      {dueDate ? (
        <span className="text-brand-strong"> · Venc. {formatCompactDate(dueDate)}</span>
      ) : null}
    </span>
  );
}

/** Status words for the listing row; an open invoice reads like other unpaid entries. */
const listingStatusLabels: Record<InvoiceStatus, string> = {
  ...cardInvoiceStatusLabels,
  open: "Em aberto",
};

function CardInvoiceStatus({
  className,
  status,
}: {
  className?: string;
  status: InvoiceStatus | undefined;
}) {
  if (!status) return null;
  const Icon = statusIcons[status];
  return (
    <span className={cn("inline-flex items-center gap-2", statusClassNames[status], className)}>
      <Icon aria-hidden="true" className="size-4" />
      {listingStatusLabels[status]}
    </span>
  );
}

// Opening the payment fetches the invoices; the dialog's query then reuses that fresh result.
const PAYMENT_INVOICES_STALE_TIME = 30_000;

/** The status doubles as the invoice's "Registrar pagamento" action while something is due. */
function CardInvoiceStatusAction({
  invoice,
  payable,
  status,
}: {
  invoice: CardInvoiceTotalOutput;
  payable: boolean;
  status: InvoiceStatus | undefined;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const invoicesQuery = useQuery({
    ...invoicesQueryOptions(invoice.period),
    enabled: open,
    staleTime: PAYMENT_INVOICES_STALE_TIME,
  });
  const payment = invoicesQuery.data?.items.find((item) => item.cardId === invoice.cardId);
  if (!status) return null;
  if (!payable) return <CardInvoiceStatus status={status} />;

  async function openPayment() {
    setOpening(true);
    try {
      const invoices = await queryClient.fetchQuery({
        ...invoicesQueryOptions(invoice.period),
        staleTime: PAYMENT_INVOICES_STALE_TIME,
      });
      if (!invoices.items.some((item) => item.cardId === invoice.cardId)) throw new Error();
      setOpen(true);
    } catch {
      toast.error("Não foi possível abrir o pagamento", {
        description: "Tente novamente em instantes.",
      });
    } finally {
      setOpening(false);
    }
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Button
            aria-label={`${listingStatusLabels[status]}. Registrar pagamento da fatura ${invoice.cardName}`}
            className={cn(
              "-ml-2 gap-2 px-2 font-normal hover:text-success",
              statusClassNames[status],
            )}
            disabled={opening}
            onClick={() => void openPayment()}
            size="sm"
            type="button"
            variant="ghost"
          >
            {opening ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              (() => {
                const Icon = statusIcons[status];
                return <Icon aria-hidden="true" className="size-4" />;
              })()
            )}
            {listingStatusLabels[status]}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Registrar pagamento</TooltipContent>
      </Tooltip>
      <InvoicePaymentDialog
        accounts={invoicesQuery.data?.accounts ?? []}
        invoice={open ? (payment ?? null) : null}
        key={open ? (payment?.cardId ?? "closed") : "closed"}
        onOpenChange={setOpen}
        open={open && Boolean(payment)}
      />
    </>
  );
}

function CardInvoiceLink({
  children,
  invoice,
  ...props
}: {
  "aria-label"?: string;
  children: ReactNode;
  className?: string;
  invoice: CardInvoiceTotalOutput;
}) {
  return (
    <Link
      {...props}
      params={{ cardId: invoice.cardId }}
      search={{ period: invoice.period }}
      to="/cards/$cardId"
    >
      {children}
    </Link>
  );
}

/** One desktop row standing for every purchase on a card invoice. */
export function CardInvoiceTotalRow({
  invoice,
  selectionMode,
}: {
  invoice: CardInvoiceTotalOutput;
  selectionMode: boolean;
}) {
  const { brand, payable, summary } = useInvoiceCard(invoice);
  const [statementOpen, setStatementOpen] = useState(false);

  return (
    <TableRow>
      {selectionMode ? <TableCell /> : null}
      <TableCell>
        <button
          aria-label={`Ver lançamentos da fatura ${invoice.cardName}`}
          className="flex min-w-0 items-center gap-3 rounded-sm text-left hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setStatementOpen(true)}
          type="button"
        >
          <CardInvoiceLogo invoice={invoice} />
          <span className="grid min-w-0">
            <CardInvoiceName
              brand={brand}
              className="truncate font-medium"
              name={invoice.cardName}
            />
            <CardInvoiceDetail dueDate={summary?.dueDate} invoice={invoice} />
          </span>
        </button>
        <CardInvoiceStatementDialog
          invoice={invoice}
          onOpenChange={setStatementOpen}
          open={statementOpen}
        />
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        <CardInvoiceAmount className="font-semibold" invoice={invoice} summary={summary} />
      </TableCell>
      <TableCell className="pl-5 whitespace-nowrap">
        <span className="inline-flex items-center gap-2">
          <ReceiptText aria-hidden="true" className="size-4" />
          Fatura
        </span>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <span className="inline-flex items-center gap-2">
          <CreditCard aria-hidden="true" className="size-4" />
          Cartão de crédito
        </span>
      </TableCell>
      <TableCell>
        <span className="inline-flex min-w-0 items-center gap-2">
          <CardInvoiceLogo invoice={invoice} />
          <span className="max-w-32 truncate">{invoice.cardName}</span>
        </span>
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm">
        <CardInvoiceStatusAction invoice={invoice} payable={payable} status={summary?.status} />
      </TableCell>
      <TableCell className="text-right">
        <Button asChild size="icon-sm" variant="ghost">
          <CardInvoiceLink
            aria-label={`Abrir fatura completa ${invoice.cardName}`}
            invoice={invoice}
          >
            <ChevronRight aria-hidden="true" />
          </CardInvoiceLink>
        </Button>
      </TableCell>
    </TableRow>
  );
}

/** One mobile list item standing for every purchase on a card invoice. */
export function CardInvoiceTotalItem({ invoice }: { invoice: CardInvoiceTotalOutput }) {
  const { brand, summary } = useInvoiceCard(invoice);
  const [statementOpen, setStatementOpen] = useState(false);

  return (
    <li>
      <button
        aria-label={`Ver lançamentos da fatura ${invoice.cardName}`}
        className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setStatementOpen(true)}
        type="button"
      >
        <CardInvoiceLogo invoice={invoice} />
        <span className="grid min-w-0 flex-1">
          <CardInvoiceName
            brand={brand}
            className="truncate font-medium text-sm"
            name={invoice.cardName}
          />
          <CardInvoiceDetail dueDate={summary?.dueDate} invoice={invoice} />
        </span>
        <span className="grid shrink-0 justify-items-end gap-0.5">
          <CardInvoiceAmount
            className="font-semibold text-sm"
            invoice={invoice}
            summary={summary}
          />
          <CardInvoiceStatus className="gap-1 text-xs [&_svg]:size-3" status={summary?.status} />
        </span>
        <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
      </button>
      <CardInvoiceStatementDialog
        invoice={invoice}
        onOpenChange={setStatementOpen}
        open={statementOpen}
      />
    </li>
  );
}
