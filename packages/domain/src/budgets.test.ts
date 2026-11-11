import assert from "node:assert/strict";
import test from "node:test";
import { calculateBudgetOverview } from "./budgets";

test("keeps category excess separate from remaining limits", () => {
  const result = calculateBudgetOverview(
    [
      { categoryId: "food", amount: 100 },
      { categoryId: "transport", amount: 300 },
    ],
    {
      actualByCategory: new Map([
        ["food", 150],
        ["transport", 100],
      ]),
      projectedByCategory: new Map([["food", 50]]),
      uncategorizedActualAmount: 0,
      uncategorizedProjectedAmount: 0,
    },
  );
  assert.equal(result.availableAmount, 200);
  assert.equal(result.exceededAmount, 100);
  assert.equal(result.committedAmount, 300);
});

test("breaks down unbudgeted expenses including recurrence-only and uncategorized entries", () => {
  const result = calculateBudgetOverview([{ categoryId: "food", amount: 100 }], {
    actualByCategory: new Map([
      ["food", 20],
      ["health", 40],
      ["refunded", -10],
    ]),
    projectedByCategory: new Map([
      ["health", 10],
      ["rent", 200],
    ]),
    uncategorizedActualAmount: 30,
    uncategorizedProjectedAmount: 5,
  });
  assert.deepEqual(result.unbudgetedItems, [
    { categoryId: "rent", committedAmount: 200 },
    { categoryId: "health", committedAmount: 50 },
    { categoryId: null, committedAmount: 35 },
  ]);
  assert.equal(result.unbudgetedCommittedAmount, 285);
});

test("returns no unbudgeted expenses for an empty month", () => {
  const result = calculateBudgetOverview([], {
    actualByCategory: new Map(),
    projectedByCategory: new Map(),
    uncategorizedActualAmount: 0,
    uncategorizedProjectedAmount: 0,
  });
  assert.deepEqual(result.unbudgetedItems, []);
  assert.equal(result.unbudgetedCommittedAmount, 0);
});

const spendingOf = (actual: Array<[string, number]>, projected: Array<[string, number]> = []) => ({
  actualByCategory: new Map(actual),
  projectedByCategory: new Map(projected),
  uncategorizedActualAmount: 0,
  uncategorizedProjectedAmount: 0,
});
const parents = new Map<string, string | null>([
  ["food", null],
  ["market", "food"],
  ["bakery", "food"],
  ["home", null],
]);

test("a budget on a main category covers all of its subcategories", () => {
  const result = calculateBudgetOverview(
    [{ categoryId: "food", amount: 500 }],
    spendingOf(
      [
        ["food", 10],
        ["market", 300],
        ["bakery", 40],
        ["home", 900],
      ],
      [["market", 50]],
    ),
    parents,
  );
  assert.equal(result.progressByCategory.get("food")?.actualSpentAmount, 350);
  assert.equal(result.progressByCategory.get("food")?.projectedAmount, 50);
  assert.deepEqual(result.unbudgetedItems, [{ categoryId: "home", committedAmount: 900 }]);
});

test("a budget on a subcategory covers only it, and overlaps count once in the totals", () => {
  const result = calculateBudgetOverview(
    [
      { categoryId: "food", amount: 500 },
      { categoryId: "market", amount: 200 },
    ],
    spendingOf([
      ["market", 300],
      ["bakery", 40],
    ]),
    parents,
  );
  assert.equal(result.progressByCategory.get("market")?.actualSpentAmount, 300);
  assert.equal(result.progressByCategory.get("market")?.status, "exceeded");
  assert.equal(result.progressByCategory.get("food")?.actualSpentAmount, 340);
  assert.equal(result.actualSpentAmount, 340);
  assert.equal(result.allocatedAmount, 700);
});
