import type { DailyTransactionSummaryOutput } from "@openmonetis/validators/transactions";
import { MoneyValue } from "@/components/money-value";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  formatTransactionDayLabel,
  getTransactionDaySummaryLines,
  type TransactionDaySummaryLine,
  type TransactionDaySummaryOptions,
} from "../transactions.presentation";

export type TransactionDayGrouping = {
  options: TransactionDaySummaryOptions;
  summaries: DailyTransactionSummaryOutput[];
};

const dotClassNames: Record<TransactionDaySummaryLine["tone"], string> = {
  expense: "bg-destructive",
  income: "bg-success",
  running: "bg-info",
};

const amountClassNames: Record<TransactionDaySummaryLine["tone"], string> = {
  expense: "text-destructive",
  income: "text-success",
  running: "font-semibold text-foreground",
};

function findSummary(grouping: TransactionDayGrouping, date: string) {
  return grouping.summaries.find((summary) => summary.date === date);
}

function SummaryLabel({ line }: { line: TransactionDaySummaryLine }) {
  return (
    <span className="inline-flex items-center gap-2 text-muted-foreground text-sm">
      <span aria-hidden="true" className={cn("size-2 rounded-full", dotClassNames[line.tone])} />
      {line.label}
    </span>
  );
}

/** Day heading row for the desktop table. */
export function TransactionDayHeaderRow({ columns, date }: { columns: number; date: string }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="bg-muted/50 py-2 font-semibold text-sm" colSpan={columns}>
        {formatTransactionDayLabel(date)}
      </TableCell>
    </TableRow>
  );
}

/** Consolidated lines closing a day group in the desktop table, aligned with the amount column. */
export function TransactionDaySummaryRows({
  date,
  grouping,
  leadingColumns,
  trailingColumns,
}: {
  date: string;
  grouping: TransactionDayGrouping;
  /** Columns before the description (e.g. the selection checkbox). */
  leadingColumns: number;
  /** Columns after the amount. */
  trailingColumns: number;
}) {
  const summary = findSummary(grouping, date);
  if (!summary) return null;
  const lines = getTransactionDaySummaryLines(summary, grouping.options);

  return lines.map((line, index) => (
    <TableRow
      className={cn("hover:bg-transparent", index < lines.length - 1 && "border-b-0")}
      key={line.key}
    >
      {leadingColumns ? <TableCell colSpan={leadingColumns} /> : null}
      <TableCell className="py-1.5">
        <SummaryLabel line={line} />
      </TableCell>
      <TableCell className="py-1.5 text-right">
        <MoneyValue
          amount={line.amount}
          className={cn("text-sm", amountClassNames[line.tone])}
          showPositiveSign={line.tone === "income"}
        />
      </TableCell>
      <TableCell colSpan={trailingColumns} />
    </TableRow>
  ));
}

/** Consolidated lines closing a day group in the mobile list. */
export function TransactionDaySummaryList({
  date,
  grouping,
}: {
  date: string;
  grouping: TransactionDayGrouping;
}) {
  const summary = findSummary(grouping, date);
  if (!summary) return null;

  return (
    <dl className="grid gap-1.5 border-t bg-muted/30 px-3 py-2.5">
      {getTransactionDaySummaryLines(summary, grouping.options).map((line) => (
        <div className="flex items-center justify-between gap-3" key={line.key}>
          <dt>
            <SummaryLabel line={line} />
          </dt>
          <dd>
            <MoneyValue
              amount={line.amount}
              className={cn("text-sm", amountClassNames[line.tone])}
              showPositiveSign={line.tone === "income"}
            />
          </dd>
        </div>
      ))}
    </dl>
  );
}
