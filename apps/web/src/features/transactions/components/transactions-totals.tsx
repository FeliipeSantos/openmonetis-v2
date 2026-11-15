import type { PaginatedTransactionsOutput } from "@openmonetis/validators/transactions";
import { CircleCheck, CircleDollarSign, Clock, type LucideIcon } from "lucide-react";
import { MoneyValue } from "@/components/money-value";
import { cn } from "@/lib/utils";

export type TransactionsTotalsValue = PaginatedTransactionsOutput["totals"];
export type TransactionsTotalsTone = "expense" | "income" | "transfer";

const totalIconClassNames: Record<TransactionsTotalsTone, string> = {
  expense: "text-destructive",
  income: "text-success",
  transfer: "text-info",
};

function TotalsItem({
  amount,
  emphasized = false,
  icon: Icon,
  iconClassName,
  label,
  unsigned,
}: {
  amount: number;
  emphasized?: boolean;
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  unsigned: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Icon aria-hidden="true" className={cn("size-4", iconClassName)} />
        {label}:
      </dt>
      <dd>
        <MoneyValue
          amount={unsigned ? Math.abs(amount) : amount}
          className={cn("text-foreground", emphasized ? "font-semibold" : "font-medium")}
        />
      </dd>
    </div>
  );
}

/**
 * Sum of every listed item (all pages, current filters), split into settled and pending.
 * `unsigned` drops the sign when the listing holds a single type (e.g. the Despesas tab).
 */
export function TransactionsTotals({
  className,
  tone,
  totals,
  unsigned = false,
}: {
  className?: string;
  /** Listed type; colors the total icon. Mixed listings stay neutral. */
  tone?: TransactionsTotalsTone;
  totals: TransactionsTotalsValue;
  unsigned?: boolean;
}) {
  return (
    <dl
      aria-label="Soma dos lançamentos listados"
      className={cn("flex flex-wrap items-center gap-x-5 gap-y-1 text-sm", className)}
    >
      <TotalsItem
        amount={totals.settled}
        icon={CircleCheck}
        iconClassName="text-success"
        label="Efetivadas"
        unsigned={unsigned}
      />
      <TotalsItem
        amount={totals.pending}
        icon={Clock}
        iconClassName="text-muted-foreground"
        label="Pendentes"
        unsigned={unsigned}
      />
      <TotalsItem
        amount={totals.total}
        emphasized
        icon={CircleDollarSign}
        iconClassName={tone ? totalIconClassNames[tone] : "text-foreground"}
        label="Total"
        unsigned={unsigned}
      />
    </dl>
  );
}
