import type { PersonBalanceOutput } from "@openmonetis/validators/person-settlements";

/** Amount shown next to the balance label: the person's credit, or what is still receivable. */
export function getPersonBalanceAmount(balance: PersonBalanceOutput) {
  return balance.status === "credit" ? balance.creditAmount : balance.receivableAmount;
}

export function personBalanceLabel(status: PersonBalanceOutput["status"]) {
  if (status === "credit") return "Crédito da pessoa";
  if (status === "receivable") return "A receber";
  return "Acertado";
}

/** Floors the ratio so the UI never shows 100% while any amount is still pending. */
export function getSettlementProgressPercentage(coveredAmount: number, dueAmount: number) {
  const dueCents = Math.round(dueAmount * 100);
  if (dueCents <= 0) return 100;
  const percentage = Math.floor((Math.round(coveredAmount * 100) * 100) / dueCents);
  return Math.min(100, Math.max(0, percentage));
}

export function formatPendingPeopleCount(count: number) {
  return `${count} ${count === 1 ? "pendente" : "pendentes"}`;
}

/** "1 de 2" for an installment, null otherwise. */
export function formatSettlementItemInstallment(item: {
  currentInstallment: number | null;
  installmentCount: number | null;
}) {
  return item.currentInstallment && item.installmentCount
    ? `${item.currentInstallment} de ${item.installmentCount}`
    : null;
}

/** Note saved with a one-click repasse: the expense and, for installments, which one. */
export function formatSettlementItemNote(item: {
  name: string;
  currentInstallment: number | null;
  installmentCount: number | null;
}) {
  const installment = formatSettlementItemInstallment(item);
  return (installment ? `${item.name} (${installment})` : item.name).slice(0, 500);
}

/** "19/11" from "2026-11-19". */
export function formatSettlementItemDate(value: string) {
  const [, month, day] = value.split("-");
  return `${day}/${month}`;
}
