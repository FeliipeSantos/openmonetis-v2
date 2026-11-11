import assert from "node:assert/strict";
import test from "node:test";
import type { CategoryOutput } from "@openmonetis/validators/categories";
import {
  getCategoryGroups,
  getCategoryLabel,
  getSubcategoryCountLabel,
  getSubcategoryOptions,
  getSubcategoryPlaceholder,
  sortCategoryOptions,
} from "./categories.presentation";

const date = "2026-10-12T00:00:00.000Z";
const root: CategoryOutput = {
  id: "home",
  name: "Casa",
  icon: null,
  type: "expense",
  isSystem: false,
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
