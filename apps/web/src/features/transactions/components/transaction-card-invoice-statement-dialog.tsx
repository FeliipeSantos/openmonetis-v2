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
import { getInvoiceOwnShare } from "@/features/invoices/invoice-own-share";
import { invoicesQueryOptions } from "@/features/invoices/invoices.queries";
import { peopleQueryOptions } from "@/features/people/people.queries";
import { formatPeriod } from "@/lib/period-presentation";
import { cn } from "@/lib/utils";
import {
  formatCompactDate,
  formatTransactionDayLabel,
  getTransactionDaySummaryLines,
  groupTransactionsByDay,
  type TransactionDaySummaryLine,
} from "../transactions.presentation";
import { transactionsQueryOptions } from "../transactions.queries";
import {
  type TransactionItemActionHandlers,
  TransactionItemActions,
} from "./transaction-item-actions";
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
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-foreground/10">
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

/** One day as in the listing table: gray heading, purchases split by lines, then the day's totals. */
function StatementDay({
  actions,
  adminPersonId,
  date,
  items,
  summaryLines,
}: {
  actions?: TransactionItemActionHandlers;
  /** The user's own person: their purchases show no avatar, like in the listing. */
  adminPersonId: string | null;
  date: string;
  items: TransactionOutput[];
  summaryLines: TransactionDaySummaryLine[];
}) {
  return (
    <section aria-label={formatTransactionDayLabel(date)} className="border-b last:border-b-0">
      <h3 className="border-b bg-foreground/5 px-3 py-2 font-semibold text-sm">
        {formatTransactionDayLabel(date)}
      </h3>
      <ul className="divide-y">
        {items.map((item) => {
          const amount = item.allocation?.amount ?? item.amount;
          const installment =
            item.installmentCount && item.currentInstallment
              ? `${item.currentInstallment} de ${item.installmentCount}`
              : null;
          return (
            <li className="relative" key={item.id}>
              {actions ? <TransactionItemActions actions={actions} transaction={item} /> : null}
              <div className="pointer-events-none relative flex items-center gap-3 px-3 py-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground/10 text-muted-foreground">
                  <CategoryIcon className="size-4" name={item.categoryIcon} />
                </span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium text-sm">{item.name}</span>
                    {installment ? (
                      <span className="shrink-0 rounded-md border px-1.5 py-0.5 text-muted-foreground text-xs tabular-nums">
                        {installment}
                      </span>
                    ) : null}
                    {item.allocation !== null ||
                    item.isDivided ||
                    (adminPersonId !== null && item.personId !== adminPersonId) ? (
                      <span className="pointer-events-auto shrink-0">
                        <TransactionPeople transaction={item} />
                      </span>
                    ) : null}
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap text-muted-foreground text-xs">
                    <span>{formatCompactDate(item.purchaseDate)}</span>
                    {item.purchaseTime ? (
                      <span className="tabular-nums">{item.purchaseTime}</span>
                    ) : null}
                    {item.categoryName ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <CategoryIcon className="size-3.5 shrink-0" name={item.categoryIcon} />
                        <span className="truncate">{item.categoryName}</span>
                      </>
                    ) : null}
                  </span>
                </span>
                <MoneyValue
                  amount={amount}
                  className={cn("shrink-0 font-semibold text-sm", amount > 0 && "text-success")}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {summaryLines.length ? (
        <dl className="grid gap-1 border-t px-3 py-2">
          {summaryLines.map((line) => (
            <div className="flex items-center justify-between gap-3" key={line.key}>
              <dt className="inline-flex items-center gap-2 text-muted-foreground text-sm">
                <span
                  aria-hidden="true"
                  className={cn("size-2 rounded-full", summaryDotClassNames[line.tone])}
                />
                {line.label}
              </dt>
              <dd>
                <MoneyValue
                  amount={line.amount}
                  className={cn("text-sm", summaryAmountClassNames[line.tone])}
                  showPositiveSign={line.tone === "income"}
                />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}

/** Body mounted per opening, so the month always starts at the invoice that was clicked. */
function StatementBody({
  actions,
  invoice,
}: {
  actions?: TransactionItemActionHandlers;
  invoice: CardInvoiceTotalOutput;
}) {
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
        <div className="flex items-center justify-center gap-2 rounded-lg bg-foreground/5 p-1">
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

        <div className="flex items-center gap-3 border-y px-4 py-3">
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
          "min-h-40 flex-1 overflow-y-auto border-y transition-opacity [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]",
          query.isPlaceholderData && "opacity-60",
        )}
      >
        {query.isPending ? (
          <div aria-label="Carregando fatura" className="grid gap-2 p-3" role="status">
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
          <div>
            {days.map((day) => (
              <StatementDay
                actions={actions}
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
          <p className="border-t px-3 py-2 text-center text-muted-foreground text-xs">
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

/** The purchases of one card invoice, without leaving the listing. */
export function CardInvoiceStatementDialog({
  actions,
  invoice,
  onOpenChange,
  open,
}: {
  /** The listing's row actions; without them the statement is read-only. */
  actions?: TransactionItemActionHandlers;
  invoice: CardInvoiceTotalOutput;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[min(94vh,64rem)] flex-col gap-4 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Fatura {invoice.cardName}</DialogTitle>
          <DialogDescription>Lançamentos da fatura, dia a dia.</DialogDescription>
        </DialogHeader>
        {open ? <StatementBody actions={actions} invoice={invoice} /> : null}
      </DialogContent>
    </Dialog>
  );
}
