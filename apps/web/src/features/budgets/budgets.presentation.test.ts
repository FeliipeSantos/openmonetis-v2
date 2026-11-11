import assert from "node:assert/strict";
import test from "node:test";
import { splitBudgetCategoryName } from "./budgets.presentation";

test("a subcategory budget shows the subcategory as title and its main category apart", () => {
  assert.deepEqual(splitBudgetCategoryName("Alimentação › Feira / Hortifruti"), {
    name: "Feira / Hortifruti",
    parentName: "Alimentação",
  });
  assert.deepEqual(splitBudgetCategoryName("Lazer e Entretenimento"), {
    name: "Lazer e Entretenimento",
    parentName: null,
  });
});
