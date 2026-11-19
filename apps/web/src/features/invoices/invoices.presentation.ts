import {
  dateOnlyToSafeInstant,
  differenceInCalendarDaysFromTodayInBrazil,
  formatDateInBrazil,
} from "@openmonetis/shared/date-time";
import { formatRecordedPaymentDate } from "@/lib/payment-presentation";

export function invoiceDueLabel(value: string) {
  const days = differenceInCalendarDaysFromTodayInBrazil(value);
  if (days === 0) return "Vence hoje";
  if (days === 1) return "Vence amanhã";
  if (days > 1) return `Vence em ${days} dias`;
  if (days === -1) return "Venceu ontem";
  return `Venceu há ${Math.abs(days)} dias`;
}

export function invoicePaidLabel(value: string) {
  return formatRecordedPaymentDate(value);
}

export function formatInvoicePaymentOption(amount: number, paidAt: string) {
  const formattedAmount = amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const formattedDate = formatDateInBrazil(dateOnlyToSafeInstant(paidAt), {});

  return `${formattedAmount} · ${formattedDate}`;
}

/**
 * Splits an invoice between the user and the other people charged on it, for showing the
 * user's own share next to the total. Null when the whole invoice is the user's.
 */
export function getInvoiceOwnShare(
  invoice:
    | { amount: number; people: Array<{ personRole: "admin" | "external"; amount: number }> }
    | undefined,
) {
  if (!invoice) return null;
  const otherCents = invoice.people
    .filter((person) => person.personRole !== "admin")
    .reduce((total, person) => total + Math.round(person.amount * 100), 0);
  if (otherCents <= 0) return null;
  const totalCents = Math.round(invoice.amount * 100);
  return {
    totalAmount: totalCents / 100,
    ownAmount: Math.max(0, totalCents - otherCents) / 100,
    othersAmount: otherCents / 100,
  };
}
