import assert from "node:assert/strict";
import test from "node:test";
import { getInvoiceOwnShare } from "./invoices.presentation";

test("own share separates the other people's purchases from the invoice total", () => {
  assert.deepEqual(
    getInvoiceOwnShare({
      amount: 225,
      people: [
        { personRole: "admin", amount: 0 },
        { personRole: "external", amount: 225 },
      ],
    }),
    { totalAmount: 225, ownAmount: 0, othersAmount: 225 },
  );
  assert.deepEqual(
    getInvoiceOwnShare({
      amount: 350.1,
      people: [
        { personRole: "admin", amount: 125.1 },
        { personRole: "external", amount: 225 },
      ],
    }),
    { totalAmount: 350.1, ownAmount: 125.1, othersAmount: 225 },
  );
  assert.equal(
    getInvoiceOwnShare({ amount: 100, people: [{ personRole: "admin", amount: 100 }] }),
    null,
  );
  assert.equal(getInvoiceOwnShare(undefined), null);
});
