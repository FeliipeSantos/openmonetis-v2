import assert from "node:assert/strict";
import test from "node:test";
import {
  getChangedTransactionInput,
  getDefaultTransactionFormValues,
  normalizeTransactionInput,
  type TransactionFormValues,
  validateTransactionForm,
} from "./transaction-form.validation";

const paidBoleto = {
  type: "expense",
  condition: "single",
  paymentMethod: "boleto",
  name: "Conta de energia",
  amount: "100",
  purchaseDate: "2026-08-20",
  purchaseTime: "",
  invoicePeriod: "",
  personId: "10000000-0000-4000-8000-000000000001",
  accountId: "20000000-0000-4000-8000-000000000002",
  cardId: "",
  categoryId: "30000000-0000-4000-8000-000000000003",
  sourceAccountId: "",
  destinationAccountId: "",
  dueDate: "2026-09-03",
  boletoPaymentDate: "2026-08-20",
  installmentCount: "2",
  startInstallment: "1",
  installmentAmountMode: "total",
  recurrenceFrequency: "monthly",
  recurrenceEndDate: "",
  dueDateRuleExcluded: false,
  excludeFromBudget: false,
  recurrenceAnchorDate: "",
  isSettled: "true",
  note: "",
  splitShares: [],
  tagIds: [],
} satisfies TransactionFormValues;

test("recurrence deadlines are optional, inclusive and validated in the form", () => {
  const recurring: TransactionFormValues = {
    ...paidBoleto,
    condition: "recurring",
    paymentMethod: "pix",
    boletoPaymentDate: "",
    recurrenceEndDate: "2026-08-20",
  };
  assert.equal(validateTransactionForm({ value: recurring }), undefined);
  assert.equal(normalizeTransactionInput(recurring).recurrenceEndDate, "2026-08-20");
  assert.equal(
    normalizeTransactionInput({ ...recurring, recurrenceEndDate: "" }).recurrenceEndDate,
    null,
  );
  assert.ok(
    validateTransactionForm({ value: { ...recurring, recurrenceEndDate: "2026-08-19" } })?.fields
      .recurrenceEndDate,
  );
  assert.equal(
    normalizeTransactionInput({ ...paidBoleto, recurrenceEndDate: "2026-12-31" }).recurrenceEndDate,
    null,
  );
  assert.deepEqual(
    getChangedTransactionInput(
      normalizeTransactionInput({ ...recurring, recurrenceEndDate: "" }),
      { ...recurring, recurrenceEndDate: "" },
      recurring,
    ),
    { recurrenceEndDate: null },
  );
});

test("purchase time is optional, validated and dropped for recurring transactions", () => {
  assert.equal(normalizeTransactionInput(paidBoleto).purchaseTime, null);
  assert.equal(
    normalizeTransactionInput({ ...paidBoleto, purchaseTime: "18:05" }).purchaseTime,
    "18:05",
  );
  assert.ok(
    validateTransactionForm({ value: { ...paidBoleto, purchaseTime: "25:00" } })?.fields
      .purchaseTime,
  );
  const recurring: TransactionFormValues = {
    ...paidBoleto,
    condition: "recurring",
    paymentMethod: "pix",
    boletoPaymentDate: "",
    purchaseTime: "18:05",
  };
  assert.equal(validateTransactionForm({ value: recurring }), undefined);
  assert.equal(normalizeTransactionInput(recurring).purchaseTime, null);
  assert.deepEqual(
    getChangedTransactionInput(
      normalizeTransactionInput({ ...paidBoleto, purchaseTime: "" }),
      { ...paidBoleto, purchaseTime: "" },
      { ...paidBoleto, purchaseTime: "09:30" },
    ),
    { purchaseTime: null },
  );
});

test("paid boleto form preserves a payment date before the due month", () => {
  const input = normalizeTransactionInput(paidBoleto);

  assert.equal(input.dueDate, "2026-09-03");
  assert.equal(input.boletoPaymentDate, "2026-08-20");
  assert.equal(validateTransactionForm({ value: paidBoleto }), undefined);
});

test("non-card expense forms retain optional due dates for payables, installments and recurring rules", () => {
  for (const paymentMethod of ["pix", "debit_card", "cash", "bank_transfer", "benefits"] as const) {
    for (const condition of ["single", "installment", "recurring"] as const) {
      const values: TransactionFormValues = {
        ...paidBoleto,
        paymentMethod,
        condition,
        isSettled: "false",
        boletoPaymentDate: "",
      };
      assert.equal(validateTransactionForm({ value: values }), undefined);
      assert.equal(normalizeTransactionInput(values).dueDate, "2026-09-03");
      assert.equal(normalizeTransactionInput({ ...values, dueDate: "" }).dueDate, null);
    }
  }
  assert.equal(
    normalizeTransactionInput({
      ...paidBoleto,
      paymentMethod: "credit_card",
      cardId: paidBoleto.accountId,
    }).dueDate,
    null,
  );
});

test("paid boleto form requires the effective payment date", () => {
  const validation = validateTransactionForm({
    value: { ...paidBoleto, boletoPaymentDate: "" },
  });

  assert.equal(validation?.fields.boletoPaymentDate, "Informe uma data de pagamento válida.");
});

test("new transactions start pending unless a caller provides another default", () => {
  assert.equal(getDefaultTransactionFormValues([], [], [], "expense").isSettled, "false");
  assert.equal(getDefaultTransactionFormValues([], [], [], "income").isSettled, "false");
  assert.equal(getDefaultTransactionFormValues([], [], [], "transfer").isSettled, "false");
  assert.equal(
    getDefaultTransactionFormValues([], [], [], "expense", undefined, { isSettled: "true" })
      .isSettled,
    "true",
  );
});

test("tag edits preserve unchanged scopes and send explicit removals", () => {
  const tagId = "40000000-0000-4000-8000-000000000004";
  const defaults = { ...paidBoleto, tagIds: [tagId] };
  const renamed = { ...defaults, name: "Conta renomeada" };
  const renamedInput = normalizeTransactionInput(renamed);
  assert.deepEqual(renamedInput.tagIds, [tagId]);
  assert.equal(getChangedTransactionInput(renamedInput, renamed, defaults).tagIds, undefined);
  const removed = { ...defaults, tagIds: [] };
  assert.deepEqual(
    getChangedTransactionInput(normalizeTransactionInput(removed), removed, defaults).tagIds,
    [],
  );
  assert.equal(
    validateTransactionForm({ value: { ...defaults, tagIds: [tagId, tagId] } })?.fields.tagIds,
    "Selecione até 20 etiquetas.",
  );
});

test("only expenses can be left out of budgets", () => {
  assert.equal(
    normalizeTransactionInput({ ...paidBoleto, excludeFromBudget: true }).excludeFromBudget,
    true,
  );
  assert.equal(
    normalizeTransactionInput({ ...paidBoleto, type: "income", excludeFromBudget: true })
      .excludeFromBudget,
    false,
  );
});

test("new transactions start with the current Brazil time unless a caller provides one", () => {
  assert.match(
    getDefaultTransactionFormValues([], [], [], "expense").purchaseTime,
    /^\d{2}:\d{2}$/,
  );
  assert.equal(
    getDefaultTransactionFormValues([], [], [], "income", undefined, { purchaseTime: "07:45" })
      .purchaseTime,
    "07:45",
  );
});

test("only new installment purchases typed per installment send the amount mode", () => {
  const installment: TransactionFormValues = {
    ...paidBoleto,
    condition: "installment",
    paymentMethod: "pix",
    boletoPaymentDate: "",
    installmentCount: "3",
    installmentAmountMode: "perInstallment",
  };
  assert.equal(normalizeTransactionInput(installment).installmentAmountMode, "perInstallment");
  assert.equal(
    normalizeTransactionInput({ ...installment, installmentAmountMode: "total" })
      .installmentAmountMode,
    undefined,
  );
  assert.equal(
    normalizeTransactionInput({ ...installment, condition: "single" }).installmentAmountMode,
    undefined,
  );
});
