import assert from "node:assert/strict";
import test from "node:test";
import {
  formatSettlementItemDate,
  formatSettlementItemInstallment,
  formatSettlementItemNote,
} from "./person-settlements.presentation";

test("settlement items show the installment and keep it in the repasse note", () => {
  const installment = {
    name: "Despesa da Vitoria Parcelada",
    currentInstallment: 1,
    installmentCount: 2,
  };
  assert.equal(formatSettlementItemInstallment(installment), "1 de 2");
  assert.equal(formatSettlementItemNote(installment), "Despesa da Vitoria Parcelada (1 de 2)");
  assert.equal(
    formatSettlementItemNote({
      name: "Tesde despesa credito",
      currentInstallment: null,
      installmentCount: null,
    }),
    "Tesde despesa credito",
  );
  assert.equal(formatSettlementItemDate("2026-11-19"), "19/11");
});
