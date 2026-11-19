import { addMonthsToPeriod } from "@openmonetis/domain/transactions";
import type {
  CardInvoiceTotalOutput,
  TransactionOutput,
} from "@openmonetis/validators/transactions";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { ChevronLeft, ChevronRight, CreditCard, ExternalLink, RefreshCw } from "lucide-react";
import { useState } from "react";
import { MoneyValue } from "@/components/money-value";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cardsQueryOptions } from "@/features/cards/cards.queries";
import { CategoryIcon } from "@/features/categories/category-icons";
import { getInvoiceOwnShare } from "@/features/invoices/invoices.presentation";
import { invoicesQueryOptions } from "@/features/invoices/invoices.queries";
import { peopleQueryOptions } from "@/features/people/people.queries";
import { formatPeriod } from "@/lib/period-presentation";
import { cn } from "@/lib/utils";
import {
  formatTransactionDayLabel,
  getTransactionDaySummaryLines,
  groupTransactionsByDay,
  type TransactionDaySummaryLine,
} from "../transactions.presentation";
import { transactionsQueryOptions } from "../transactions.queries";
import { TransactionPeople } from "./transaction-people";

/** Largest page the listing API serves; bigger invoices point to the full card page. */
const STATEMENT_PAGE_SIZE = 100;

/** Same day consolidation as the full invoice page: outflows, inflows and the running invoice. */
const invoiceDaySummaryOptions = { runningLabel: "Fatura", runningAsDebt: true };

/** "08/11" from "2026-11-08". */
function formatDayMonth(value: string) {
  const [, month, day] = value.split("-");
  return `${day}/${month}`;
}

function CardLogo({ logo }: { logo: string | null }) {
  return logo ? (
    <Image
      alt=""
      className="size-10 shrink-0 rounded-full object-contain"
      height={40}
      layout="fixed"
      src={logo}
      width={40}
    />
  ) : (
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted">
      <CreditCard aria-hidden="true" className="size-5" />
    </span>
  );
}

function InvoiceDate({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="grid justify-items-end text-right">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium text-sm tabular-nums">
        {value ? formatDayMonth(value) : "–"}
      </span>
    </div>
  );
}

const summaryDotClassNames: Record<TransactionDaySummaryLine["tone"], string> = {
  expense: "bg-destructive",
  income: "bg-success",
  running: "bg-info",
};

const summaryAmountClassNames: Record<TransactionDaySummaryLine["tone"], string> = {
  expense: "text-destructive",
  income: "text-success",
  running: "font-semibold text-foreground",
};

/** One day as a timeline: purchases and the day's totals hang from the same vertical line. */
function StatementDay({
  adminPersonId,
  date,
  items,
  summaryLines,
}: {
  /** The user's own person: their purchases show no avatar, like in the listing. */
  adminPersonId: string | null;
  date: string;
  items: TransactionOutput[];
  summaryLines: TransactionDaySummaryLine[];
}) {
  return (
    <section aria-label={formatTransactionDayLabel(date)} className="grid gap-1">
      <h3 className="rounded-full bg-muted px-4 py-2 font-semibold text-sm">
        {formatTransactionDayLabel(date)}
      </h3>
      <div className="relative">
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0 left-[1.875rem] w-px -translate-x-1/2 bg-border"
        />
        <ul>
          {items.map((item) => {
            const amount = item.allocation?.amount ?? item.amount;
            return (
              <li className="relative flex items-center gap-3 px-3 py-2.5" key={item.id}>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                  <CategoryIcon className="size-4" name={item.categoryIcon} />
                </span>
                <span className="grid min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium text-sm">{item.name}</span>
                    {item.allocation !== null ||
                    item.isDivided ||
                    (adminPersonId !== null && item.personId !== adminPersonId) ? (
                      <span className="shrink-0">
                        <TransactionPeople transaction={item} />
                      </span>
                    ) : null}
                  </span>
                  <span className="truncate text-muted-foreground text-xs">
                    {[
                      item.categoryName,
                      item.installmentCount && item.currentInstallment
                        ? `${item.currentInstallment} de ${item.installmentCount}`
                        : null,
                      item.purchaseTime,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <MoneyValue
                  amount={amount}
                  className={cn(
                    "shrink-0 font-medium text-sm",
                    amount < 0 ? "text-destructive" : "text-success",
                  )}
                />
              </li>
            );
          })}
        </ul>
        {summaryLines.length ? (
          <dl>
            {summaryLines.map((line) => (
              <div className="relative flex items-center gap-3 px-3 py-2" key={line.key}>
                <span aria-hidden="true" className="grid w-9 shrink-0 place-items-center">
                  <span
                    className={cn(
                      "size-3 rounded-full ring-4 ring-popover",
                      summaryDotClassNames[line.tone],
                    )}
                  />
                </span>
                <dt className="flex-1 text-sm">{line.label}</dt>
                <dd>
                  <MoneyValue
                    amount={line.amount}
                    className={cn("text-sm", summaryAmountClassNames[line.tone])}
                  />
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  );
}

/** Body mounted per opening, so the month always starts at the invoice that was clicked. */
function StatementBody({ invoice }: { invoice: CardInvoiceTotalOutput }) {
  const [period, setPeriod] = useState(invoice.period);
  const cardsQuery = useQuery(cardsQueryOptions(period));
  const peopleQuery = useQuery(peopleQueryOptions());
  const adminPersonId = peopleQuery.data?.find((person) => person.role === "admin")?.id ?? null;
  const card = cardsQuery.data?.find((item) => item.id === invoice.cardId);
  const summary = card?.invoiceSummary.period === period ? card.invoiceSummary : undefined;
  const query = useQuery(
    transactionsQueryOptions({
      period,
      cardIds: [invoice.cardId],
      page: 1,
      pageSize: STATEMENT_PAGE_SIZE,
      sort: "recent",
    }),
  );
  const items = query.data?.items ?? [];
  const days = groupTransactionsByDay(items, (item) => item.purchaseDate);
  const hasMore = (query.data?.total ?? 0) > items.length;
  function getDaySummaryLines(date: string) {
    const summary = query.data?.dailySummaries.find((item) => item.date === date);
    return summary ? getTransactionDaySummaryLines(summary, invoiceDaySummaryOptions) : [];
  }
  const total = summary?.amount ?? Math.abs(query.data?.totals.total ?? 0);
  const invoicesQuery = useQuery(invoicesQueryOptions(period));
  const ownShare = getInvoiceOwnShare(
    invoicesQuery.data?.items.find((item) => item.cardId === invoice.cardId),
  );

  return (
    <>
      <div className="grid gap-3">
        <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/50 p-1">
          <Button
            aria-label="Fatura anterior"
            onClick={() => setPeriod(addMonthsToPeriod(period, -1))}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span aria-live="polite" className="min-w-40 text-center font-medium text-sm">
            {formatPeriod(period)}
          </span>
          <Button
            aria-label="Próxima fatura"
            onClick={() => setPeriod(addMonthsToPeriod(period, 1))}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>

        <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
          <CardLogo logo={card?.logo ?? invoice.cardLogo} />
          <div className="grid min-w-0 flex-1">
            <span className="truncate font-medium">{card?.name ?? invoice.cardName}</span>
            {query.isFetching && !query.data ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <MoneyValue amount={total} className="text-muted-foreground text-sm" />
            )}
            {ownShare ? (
              <span className="text-muted-foreground text-xs">
                Sua parte <MoneyValue amount={ownShare.ownAmount} className="text-foreground" /> ·
                Outras pessoas <MoneyValue amount={ownShare.othersAmount} />
              </span>
            ) : null}
          </div>
          <InvoiceDate label="Fecha dia" value={summary?.closingDate} />
          <InvoiceDate label="Vence dia" value={summary?.dueDate} />
        </div>
      </div>

      <div
        className={cn(
          "min-h-40 flex-1 overflow-y-auto pr-3 transition-opacity [scrollbar-color:var(--border)_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin]",
          query.isPlaceholderData && "opacity-60",
        )}
      >
        {query.isPending ? (
          <div aria-label="Carregando fatura" className="grid gap-2" role="status">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : null}
        {query.isError ? (
          <div className="grid justify-items-center gap-3 py-8 text-center">
            <p className="text-sm">Não foi possível carregar a fatura.</p>
            <Button onClick={() => void query.refetch()} size="sm" type="button" variant="outline">
              <RefreshCw aria-hidden="true" /> Tentar novamente
            </Button>
          </div>
        ) : null}
        {query.isSuccess && items.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground text-sm">
            Nenhum lançamento nesta fatura.
          </p>
        ) : null}
        {items.length > 0 ? (
          <div className="grid gap-3">
            {days.map((day) => (
              <StatementDay
                adminPersonId={adminPersonId}
                date={day.date}
                items={day.items}
                key={day.date}
                summaryLines={getDaySummaryLines(day.date)}
              />
            ))}
          </div>
        ) : null}
        {hasMore ? (
          <p className="mt-2 text-center text-muted-foreground text-xs">
            Exibindo {items.length} de {query.data?.total} lançamentos. Veja todos na fatura
            completa.
          </p>
        ) : null}
      </div>

      <div className="flex justify-end border-t pt-4">
        <Button asChild size="sm" variant="outline">
          <Link params={{ cardId: invoice.cardId }} search={{ period }} to="/cards/$cardId">
            <ExternalLink aria-hidden="true" /> Abrir fatura completa
          </Link>
        </Button>
      </div>
    </>
  );
}

/** The purchases of one card invoice, read-only, without leaving the listing. */
export function CardInvoiceStatementDialog({
  invoice,
  onOpenChange,
  open,
}: {
  invoice: CardInvoiceTotalOutput;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[min(90vh,52rem)] flex-col gap-4 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fatura {invoice.cardName}</DialogTitle>
          <DialogDescription>Lançamentos da fatura, dia a dia.</DialogDescription>
        </DialogHeader>
        {open ? <StatementBody invoice={invoice} /> : null}
      </DialogContent>
    </Dialog>
  );
}
