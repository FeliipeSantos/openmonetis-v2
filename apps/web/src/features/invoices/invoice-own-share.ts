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
