import assert from "node:assert/strict";
import test from "node:test";
import type { BudgetOutput } from "@openmonetis/validators/budgets";
import type { CategoryOutput } from "@openmonetis/validators/categories";
import {
  applyCategoryOrder,
  getCategoryGroups,
  getCategoryLabel,
  getCategoryMonthSummaries,
  getCategorySelectionError,
  getMainCategoryId,
  getSubcategoryCountLabel,
  getSubcategoryOptions,
  getSubcategoryPlaceholder,
  missingCategoryMessage,
  missingSubcategoryMessage,
  moveCategory,
  sortCategoryOptions,
} from "./categories.presentation";

const date = "2026-10-12T00:00:00.000Z";
const root: CategoryOutput = {
  id: "home",
  name: "Casa",
  icon: null,
  type: "expense",
  isSystem: false,
  position: 0,
  createdAt: date,
  updatedAt: date,
  parentId: null,
};
const light: CategoryOutput = {
  ...root,
  id: "light",
  name: "Luz",
  parentId: "home",
  parentName: "Casa",
};
const water: CategoryOutput = { ...light, id: "water", name: "Água" };
const categories = [light, water, root, { ...root, id: "travel", name: "Viagem" }];

test("category search by parent includes children and search by child preserves parent context", () => {
  const byParent = getCategoryGroups(categories, "casa");
  assert.equal(byParent.length, 1);
  assert.deepEqual(
    byParent[0]?.children.map((child) => child.id),
    ["water", "light"],
  );
  const byChild = getCategoryGroups(categories, "luz");
  assert.equal(byChild[0]?.parent.id, "home");
  assert.deepEqual(
    byChild[0]?.children.map((child) => child.id),
    ["light"],
  );
  assert.equal(getCategoryGroups(categories, "missing").length, 0);
});

test("category options keep the parent before children and names include the full path", () => {
  assert.deepEqual(
    sortCategoryOptions(categories).map((category) => category.id),
    ["home", "water", "light", "travel"],
  );
  assert.equal(getCategoryLabel(light), "Casa › Luz");
  assert.equal(getCategoryLabel(root), "Casa");
});

test("describes how many subcategories a category has", () => {
  assert.equal(getSubcategoryCountLabel(0), "Sem subcategorias");
  assert.equal(getSubcategoryCountLabel(1), "1 subcategoria");
  assert.equal(getSubcategoryCountLabel(3), "3 subcategorias");
  assert.equal(getSubcategoryCountLabel(2, true), "2 subcategorias na busca");
  assert.equal(getSubcategoryCountLabel(0, true), "Sem subcategorias");
});

test("subcategory options follow the main category of the chosen id", () => {
  const fromChild = getSubcategoryOptions(categories, "light");
  assert.equal(fromChild.parent?.id, "home");
  assert.equal(fromChild.selected?.id, "light");
  assert.deepEqual(
    fromChild.options.map((option) => option.id),
    ["water", "light"],
  );
  const fromParent = getSubcategoryOptions(categories, "home", "lu");
  assert.equal(fromParent.selected, undefined);
  assert.deepEqual(
    fromParent.options.map((option) => option.id),
    ["light"],
  );
  assert.deepEqual(getSubcategoryOptions(categories, "travel").options, []);
  assert.equal(getSubcategoryOptions(categories, "").parent, undefined);
  assert.equal(getSubcategoryPlaceholder(undefined, false), "Escolha a categoria");
  assert.equal(getSubcategoryPlaceholder(root, true), "Sem subcategoria");
  assert.equal(getSubcategoryPlaceholder(root, false), "Sem subcategorias");
});

test("a transaction needs a subcategory whenever its category has one", () => {
  assert.equal(getCategorySelectionError(categories, ""), missingCategoryMessage);
  assert.equal(getCategorySelectionError(categories, "home"), missingSubcategoryMessage);
  assert.equal(getCategorySelectionError(categories, "light"), undefined);
  assert.equal(getCategorySelectionError(categories, "travel"), undefined);
  assert.equal(getCategorySelectionError(categories, "deleted"), missingCategoryMessage);
});

test("moving a category reorders only its own level", () => {
  const level = [
    { ...light, position: 0 },
    { ...water, position: 1 },
    { ...light, id: "gas", name: "Gás", position: 2 },
  ];
  const all = [...level, root, { ...root, id: "travel", name: "Viagem", position: 1 }];
  assert.deepEqual(moveCategory(all, "gas", "light"), ["gas", "light", "water"]);
  assert.deepEqual(moveCategory(all, "light", "gas"), ["water", "gas", "light"]);
  assert.equal(moveCategory(all, "light", "travel"), null);
  assert.equal(moveCategory(all, "light", "light"), null);
  assert.deepEqual(
    applyCategoryOrder(all, ["gas", "light", "water"])
      .filter((category) => category.parentId === "home")
      .map((category) => [category.id, category.position]),
    [
      ["light", 1],
      ["water", 2],
      ["gas", 0],
    ],
  );
});

test("the main category of a subcategory is its parent", () => {
  assert.equal(getMainCategoryId(categories, "light"), "home");
  assert.equal(getMainCategoryId(categories, "home"), "home");
  assert.equal(getMainCategoryId(categories, ""), undefined);
});

test("category month summaries pair API totals with budgets, including budgets without spending", () => {
  const budget = { categoryId: "travel", amount: 500, status: "onTrack" } as BudgetOutput;
  const summaries = getCategoryMonthSummaries(
    [
      { categoryId: "home", amount: 1200 },
      { categoryId: "food", amount: 300 },
    ],
    [budget, { ...budget, categoryId: "food", amount: 250, status: "exceeded" }],
  );

  assert.deepEqual(summaries.get("home"), { amount: 1200, budget: null });
  assert.equal(summaries.get("food")?.amount, 300);
  assert.equal(summaries.get("food")?.budget?.status, "exceeded");
  assert.deepEqual(summaries.get("travel"), { amount: 0, budget });
  assert.equal(summaries.has("unknown"), false);
});

test("category month summaries also index each subcategory total", () => {
  const summaries = getCategoryMonthSummaries(
    [{ categoryId: "home", amount: 300, subcategories: [{ categoryId: "light", amount: 120 }] }],
    [],
  );

  assert.deepEqual(summaries.get("home"), { amount: 300, budget: null });
  assert.deepEqual(summaries.get("light"), { amount: 120, budget: null });
  assert.equal(summaries.has("water"), false);
});
