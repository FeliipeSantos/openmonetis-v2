import type { PersonSettlementItemOutput } from "@openmonetis/validators/person-settlements";
import { Image } from "@unpic/react";
import { Check, CircleCheck, Loader2, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { MoneyValue } from "@/components/money-value";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/features/categories/category-icons";
import {
  paymentMethodIcons,
  paymentMethodLabels,
} from "@/features/transactions/transactions.presentation";
import { cn } from "@/lib/utils";
import {
  formatSettlementItemDate,
  formatSettlementItemInstallment,
} from "../person-settlements.presentation";

function Detail({ children }: { children: ReactNode }) {
  return <span className="inline-flex min-w-0 items-center gap-1">{children}</span>;
}

function SourceLogo({ logo }: { logo: string }) {
  return (
    <Image
      alt=""
      className="size-4 shrink-0 rounded-full object-contain"
      height={16}
      layout="fixed"
      src={logo}
      width={16}
    />
  );
}

/** One expense of the month: description, details, value and its repasse status. */
export function PersonSettlementItemRow({
  item,
  onSettle,
  pending,
}: {
  item: PersonSettlementItemOutput;
  /** Absent when the expense is already received or the person is inactive. */
  onSettle?: () => void;
  pending: boolean;
}) {
  const installment = formatSettlementItemInstallment(item);
  const isRefund = item.kind === "refund";
  const PaymentIcon = item.paymentMethod ? paymentMethodIcons[item.paymentMethod] : null;
  const sourceName = item.cardName ?? item.accountName;
  const sourceLogo = item.cardName ? item.cardLogo : item.accountLogo;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
      <div className="grid min-w-0 gap-0.5">
        <p className="flex min-w-0 items-center gap-2 font-medium text-sm">
          <span className="truncate">{item.name}</span>
          {installment ? (
            <span className="shrink-0 rounded-md border px-1.5 py-0.5 font-normal text-muted-foreground text-xs tabular-nums">
              {installment}
            </span>
          ) : null}
        </p>
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground text-xs">
          <span className="tabular-nums">{formatSettlementItemDate(item.date)}</span>
          {item.categoryName ? (
            <Detail>
              · <CategoryIcon className="size-3.5" name={item.categoryIcon} />
              <span className="truncate">{item.categoryName}</span>
            </Detail>
          ) : null}
          {item.paymentMethod && PaymentIcon ? (
            <Detail>
              · <PaymentIcon aria-hidden="true" className="size-3.5" />
              {paymentMethodLabels[item.paymentMethod]}
            </Detail>
          ) : null}
          {sourceName ? (
            <Detail>
              · {sourceLogo ? <SourceLogo logo={sourceLogo} /> : null}
              <span className="truncate">{sourceName}</span>
            </Detail>
          ) : null}
          {item.isRecurring ? (
            <Detail>
              · <RefreshCw aria-hidden="true" className="size-3" /> Recorrente
            </Detail>
          ) : null}
          {isRefund ? <span>· Estorno</span> : null}
          {item.status === "partial" ? (
            <Detail>
              · Falta <MoneyValue amount={item.remainingAmount} />
            </Detail>
          ) : null}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <MoneyValue
          amount={isRefund ? -item.amount : item.amount}
          className={cn("font-medium text-sm", isRefund && "text-success")}
        />
        {onSettle ? (
          <Button disabled={pending} onClick={onSettle} size="sm" type="button">
            {pending ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <Check aria-hidden="true" />
            )}
            Efetivar
          </Button>
        ) : item.status === "received" ? (
          <span className="inline-flex items-center gap-1 text-success text-xs">
            <CircleCheck aria-hidden="true" className="size-4" />
            {isRefund ? "Abatido" : "Recebido"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
