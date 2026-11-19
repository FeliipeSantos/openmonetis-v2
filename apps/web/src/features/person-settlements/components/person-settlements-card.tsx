import { getCurrentDateInBrazil } from "@openmonetis/shared/date-time";
import type { PersonOutput } from "@openmonetis/validators/people";
import type {
  PersonSettlementItemOutput,
  PersonSettlementOutput,
} from "@openmonetis/validators/person-settlements";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, HandCoins, ReceiptText, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MoneyValue } from "@/components/money-value";
import { StatCard } from "@/components/stat-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/features/accounts/accounts.presentation";
import { formatPeriod } from "@/lib/period-presentation";
import {
  useCreatePersonSettlementMutation,
  useDeletePersonSettlementMutation,
} from "../person-settlements.mutations";
import {
  formatSettlementItemNote,
  getPersonBalanceAmount,
  personBalanceLabel,
} from "../person-settlements.presentation";
import { personSettlementQueryOptions } from "../person-settlements.queries";
import { PersonBalanceIcon } from "./person-balance-icon";
import { PersonSettlementDialog } from "./person-settlement-dialog";
import { PersonSettlementItemRow } from "./person-settlement-item-row";

export function PersonSettlementsCard({
  person,
  period,
}: {
  person: PersonOutput;
  period: string;
}) {
  const [open, setOpen] = useState(false);
  const [settlingItemId, setSettlingItemId] = useState<string | null>(null);
  const [removingSettlement, setRemovingSettlement] = useState<PersonSettlementOutput | null>(null);
  const snapshotQuery = useQuery(personSettlementQueryOptions(person.id, period));
  const createSettlement = useCreatePersonSettlementMutation();
  const deleteSettlement = useDeletePersonSettlementMutation();

  if (person.role !== "external") return null;

  async function submit(input: Parameters<typeof createSettlement.mutateAsync>[0]) {
    await createSettlement.mutateAsync(input);
    setOpen(false);
    toast.success("Repasse registrado");
  }

  /** Records what is left of one expense as received today, in one click. */
  async function settleItem(item: PersonSettlementItemOutput) {
    setSettlingItemId(item.id);
    try {
      await createSettlement.mutateAsync({
        personId: person.id,
        amount: item.remainingAmount,
        receivedAt: getCurrentDateInBrazil(),
        period,
        note: formatSettlementItemNote(item),
      });
      toast.success("Repasse registrado", { description: item.name });
    } catch {
      toast.error("Não foi possível registrar o repasse");
    } finally {
      setSettlingItemId(null);
    }
  }

  async function remove() {
    if (!removingSettlement) return;

    try {
      await deleteSettlement.mutateAsync(removingSettlement.id);
      setRemovingSettlement(null);
      toast.success("Repasse excluído");
    } catch {
      toast.error("Não foi possível excluir o repasse");
    }
  }

  const snapshot = snapshotQuery.data;
  const balance = snapshot?.balance;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HandCoins aria-hidden="true" className="size-4 text-muted-foreground" />
            Acertos
          </CardTitle>
          <CardDescription className="text-xs">
            Histórico de pagamentos da pessoa, sem movimentar suas contas.
          </CardDescription>
          <CardAction>
            <Button disabled={person.status === "inactive"} onClick={() => setOpen(true)} size="sm">
              Registrar repasse
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          {snapshotQuery.isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando acertos…</p>
          ) : null}
          {snapshotQuery.isError ? (
            <p className="text-destructive text-sm" role="alert">
              Não foi possível carregar os acertos.
            </p>
          ) : null}
          {balance ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                className="shadow-none"
                icon={<ReceiptText />}
                label="Atribuído"
                value={<MoneyValue amount={balance.assignedAmount} />}
              />
              <StatCard
                className="shadow-none"
                icon={<ArrowDownLeft />}
                label="Recebido"
                value={<MoneyValue amount={balance.settledAmount} />}
              />
              <StatCard
                className="shadow-none"
                icon={<PersonBalanceIcon status={balance.status} />}
                label={personBalanceLabel(balance.status)}
                value={<MoneyValue amount={getPersonBalanceAmount(balance)} />}
              />
            </div>
          ) : null}
          {snapshot?.items.length ? (
            <div className="grid gap-2">
              <p className="font-medium text-sm">Lançamentos de {formatPeriod(period)}</p>
              <div className="divide-y rounded-md border">
                {snapshot.items.map((item) => (
                  <PersonSettlementItemRow
                    item={item}
                    key={item.id}
                    onSettle={
                      person.status === "active" && item.remainingAmount > 0
                        ? () => void settleItem(item)
                        : undefined
                    }
                    pending={settlingItemId === item.id}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {snapshot && !snapshot.settlements.length && !snapshot.items.length ? (
            <p className="rounded-md border border-dashed px-3 py-4 text-center text-muted-foreground text-sm">
              Nenhum repasse de {person.name} neste período. Registre aqui os valores que receber.
            </p>
          ) : null}
          {snapshot?.settlements.length ? (
            <div className="grid gap-2">
              <p className="font-medium text-sm">Repasses no período</p>
              <div className="divide-y rounded-md border">
                {snapshot.settlements.map((settlement) => (
                  <div
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                    key={settlement.id}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{formatCurrency(settlement.amount)}</p>
                      <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground text-xs">
                        <span className="shrink-0">
                          {formatSettlementDate(settlement.receivedAt)}
                        </span>
                        <span className="truncate">
                          {settlement.source === "invoicePayment" ? " · Fatura" : " · Manual"}
                          {settlement.note ? ` · ${settlement.note}` : ""}
                        </span>
                      </div>
                    </div>
                    {settlement.source === "manual" ? (
                      <Button
                        aria-label="Excluir repasse"
                        disabled={deleteSettlement.isPending}
                        onClick={() => setRemovingSettlement(settlement)}
                        size="icon-xs"
                        variant="ghost"
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
        <PersonSettlementDialog
          onOpenChange={setOpen}
          onSubmit={submit}
          open={open}
          personId={person.id}
          period={period}
          personName={person.name}
          suggestedAmount={balance?.receivableAmount}
        />
      </Card>

      <AlertDialog
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deleteSettlement.isPending) setRemovingSettlement(null);
        }}
        open={Boolean(removingSettlement)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2 aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>Excluir este repasse?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="mb-2 block font-medium text-foreground">
                {removingSettlement ? formatCurrency(removingSettlement.amount) : null}
              </span>
              <span>
                O registro será removido e o saldo com {person.name} será recalculado. Esta ação não
                pode ser desfeita.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSettlement.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteSettlement.isPending}
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
              variant="destructive"
            >
              {deleteSettlement.isPending ? "Excluindo…" : "Excluir repasse"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function formatSettlementDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
