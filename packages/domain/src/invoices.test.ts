import assert from "node:assert/strict";
import test from "node:test";
import { selectInvoicePeriodsReopenedByCharge } from "./invoices";

test("a charge reopens only the paid invoices it lands on, once each", () => {
  assert.deepEqual(
    selectInvoicePeriodsReopenedByCharge(["2026-11", "2026-12"], ["2026-12", "2027-01", "2026-12"]),
    ["2026-12"],
  );
  assert.deepEqual(selectInvoicePeriodsReopenedByCharge([], ["2026-12"]), []);
});
