import assert from "node:assert/strict";
import test from "node:test";
import {
  assertCategoryHierarchy,
  assertCategoryOrder,
  balanceAdjustmentCategoryName,
  CategoryConstraintError,
  type CategoryHierarchyNode,
  createDefaultCategoryDrafts,
  type ExistingCategory,
  expandCategoryIds,
  internalTransferCategoryName,
  invoiceAdjustmentCategoryName,
  invoicePaymentCategoryName,
  otherExpenseCategoryName,
  otherIncomeCategoryName,
  personSettlementCategoryName,
  selectMissingDefaultCategories,
  selectMissingDefaultIcons,
  selectNonDefaultCategories,
  yieldCategoryName,
} from "./categories";

function createSequentialIds() {
  let next = 0;
  return () => `id-${++next}`;
}

test("default categories keep every system category as a root without subcategories", () => {
  const drafts = createDefaultCategoryDrafts("user", createSequentialIds());
  const system = drafts.filter((draft) => draft.isSystem);
  assert.deepEqual(
    system.map((draft) => `${draft.type}:${draft.name}`).sort(),
    [
      `expense:${balanceAdjustmentCategoryName}`,
      `expense:${invoiceAdjustmentCategoryName}`,
      `expense:${invoicePaymentCategoryName}`,
      `income:${balanceAdjustmentCategoryName}`,
      `income:${internalTransferCategoryName}`,
      `income:${personSettlementCategoryName}`,
    ].sort(),
  );
  for (const draft of system) {
    assert.equal(draft.parentId, null);
    assert.ok(!drafts.some((child) => child.parentId === draft.id));
  }
});

test("default categories keep the names other flows look up", () => {
  const drafts = createDefaultCategoryDrafts("user", createSequentialIds());
  const find = (type: string, name: string) =>
    drafts.filter((draft) => draft.type === type && draft.name === name);
  assert.equal(find("income", yieldCategoryName).length, 1);
  assert.equal(find("expense", otherExpenseCategoryName)[0]?.parentId, null);
  assert.equal(find("income", otherIncomeCategoryName)[0]?.parentId, null);
});

test("default subcategories follow their parent, share its type and never repeat a name", () => {
  const drafts = createDefaultCategoryDrafts("user", createSequentialIds());
  const byId = new Map(drafts.map((draft) => [draft.id, draft]));
  const seen = new Set<string>();
  drafts.forEach((draft, index) => {
    assert.equal(draft.userId, "user");
    const key = `${draft.type}:${draft.parentId ?? "root"}:${draft.name}`;
    assert.ok(!seen.has(key), `duplicate default category ${key}`);
    seen.add(key);
    if (!draft.parentId) return;
    const parent = byId.get(draft.parentId);
    assert.ok(parent && drafts.indexOf(parent) < index, `${draft.name} needs its parent first`);
    assert.equal(parent.parentId, null);
    assert.equal(parent.type, draft.type);
    assert.equal(draft.isSystem, false);
  });
});

const categories: CategoryHierarchyNode[] = [
  { id: "home", type: "expense", parentId: null, isSystem: false },
  { id: "light", type: "expense", parentId: "home", isSystem: false },
  { id: "travel", type: "expense", parentId: null, isSystem: false },
  { id: "salary", type: "income", parentId: null, isSystem: false },
  { id: "system", type: "expense", parentId: null, isSystem: true },
];

test("category families include direct and child IDs once while a child remains independent", () => {
  assert.deepEqual(expandCategoryIds(categories, ["home", "light", "home"]), ["home", "light"]);
  assert.deepEqual(expandCategoryIds(categories, ["light"]), ["light"]);
  assert.deepEqual(expandCategoryIds(categories, ["missing"]), ["missing"]);
  assert.deepEqual(expandCategoryIds(categories, []), []);
});

test("subcategories can move between root categories of the same type or become roots", () => {
  assert.doesNotThrow(() =>
    assertCategoryHierarchy({ id: "light", type: "expense", parentId: "travel", categories }),
  );
  assert.doesNotThrow(() =>
    assertCategoryHierarchy({ id: "light", type: "expense", parentId: null, categories }),
  );
});

test("hierarchy rejects foreign or missing parents, third levels, system parents and type mismatches", () => {
  for (const parentId of ["foreign", "light", "system", "salary"]) {
    assert.throws(() => assertCategoryHierarchy({ type: "expense", parentId, categories }), {
      code: "category_invalid_parent",
    });
  }
});

test("hierarchy rejects self-reference, moving a group under its child and changing a group's type", () => {
  assert.throws(
    () => assertCategoryHierarchy({ id: "light", type: "expense", parentId: "light", categories }),
    { code: "category_invalid_parent" },
  );
  assert.throws(
    () => assertCategoryHierarchy({ id: "home", type: "expense", parentId: "light", categories }),
    { code: "category_has_children" },
  );
  assert.throws(
    () => assertCategoryHierarchy({ id: "home", type: "income", parentId: null, categories }),
    { code: "category_has_children" },
  );
});

test("syncing defaults adds only what an existing account is missing", () => {
  const defaults = createDefaultCategoryDrafts("user", createSequentialIds());
  const existing: ExistingCategory[] = [
    { id: "food", name: "alimentação", type: "expense", isSystem: false, parentId: null },
    { id: "market", name: "Supermercado", type: "expense", isSystem: false, parentId: "food" },
    { id: "old-yield", name: yieldCategoryName, type: "income", isSystem: false, parentId: null },
    {
      id: "payments",
      name: invoicePaymentCategoryName,
      type: "expense",
      isSystem: true,
      parentId: null,
    },
  ];
  const missing = selectMissingDefaultCategories(existing, defaults);
  const names = (parentId: string | null) =>
    missing.filter((draft) => (draft.parentId ?? null) === parentId).map((draft) => draft.name);

  assert.ok(!names(null).includes("Alimentação"));
  assert.ok(!names(null).includes(invoicePaymentCategoryName));
  assert.ok(!names("food").includes("Supermercado"));
  assert.ok(names("food").includes("Padaria"));
  assert.ok(!missing.some((draft) => draft.name === yieldCategoryName));
  assert.ok(names(null).includes("Moradia"));
  const housing = missing.find((draft) => draft.name === "Moradia" && !draft.parentId);
  assert.ok(names(housing?.id ?? null).includes("Aluguel"));
});

test("syncing defaults into an empty account adds the full default list", () => {
  const defaults = createDefaultCategoryDrafts("user", createSequentialIds());
  assert.deepEqual(selectMissingDefaultCategories([], defaults), defaults);
  assert.deepEqual(
    selectMissingDefaultCategories(
      defaults.map((draft) => ({ ...draft, id: draft.id as string })),
      defaults,
    ),
    [],
  );
});

test("non-default categories exclude system ones and list subcategories before parents", () => {
  const defaults = createDefaultCategoryDrafts("user", createSequentialIds());
  const existing: ExistingCategory[] = [
    { id: "food", name: "Alimentação", type: "expense", isSystem: false, parentId: null },
    { id: "market", name: "supermercado", type: "expense", isSystem: false, parentId: "food" },
    { id: "fair", name: "Feira", type: "expense", isSystem: false, parentId: "food" },
    { id: "old", name: "Mercado", type: "expense", isSystem: false, parentId: null },
    { id: "old-child", name: "Supermercado", type: "expense", isSystem: false, parentId: "old" },
    {
      id: "payments",
      name: invoicePaymentCategoryName,
      type: "expense",
      isSystem: true,
      parentId: null,
    },
    { id: "salary", name: "Salário", type: "income", isSystem: false, parentId: null },
  ];
  assert.deepEqual(
    selectNonDefaultCategories(existing, defaults).map((category) => category.id),
    ["fair", "old-child", "old", "salary"],
  );
});

test("a new order must list every category of the level exactly once", () => {
  assert.doesNotThrow(() => assertCategoryOrder(["a", "b", "c"], ["c", "a", "b"]));
  for (const ids of [
    ["a", "b"],
    ["a", "b", "c", "d"],
    ["a", "a", "b"],
    ["a", "b", "x"],
  ]) {
    assert.throws(
      () => assertCategoryOrder(["a", "b", "c"], ids),
      (error: unknown) =>
        error instanceof CategoryConstraintError && error.code === "category_invalid_order",
    );
  }
});

test("default categories start in alphabetical order at each level", () => {
  const drafts = createDefaultCategoryDrafts("user", createSequentialIds());
  const level = (type: string, parentId: string | null) =>
    drafts
      .filter((draft) => draft.type === type && (draft.parentId ?? null) === parentId)
      .sort((left, right) => (left.position ?? 0) - (right.position ?? 0))
      .map((draft) => draft.name);
  const roots = level("expense", null);
  assert.deepEqual(
    roots,
    [...roots].sort((left, right) => left.localeCompare(right, "pt-BR")),
  );
  const food = drafts.find((draft) => draft.name === "Alimentação" && !draft.parentId);
  assert.equal(level("expense", food?.id ?? null)[0], "Alimentação no trabalho");
});

test("syncing fills only the missing icons of default categories", () => {
  const defaults = createDefaultCategoryDrafts("user", createSequentialIds());
  const updates = selectMissingDefaultIcons(
    [
      { id: "home", name: "Moradia", type: "expense", isSystem: false, parentId: null, icon: "" },
      {
        id: "condo",
        name: "condomínio",
        type: "expense",
        isSystem: false,
        parentId: "home",
        icon: null,
      },
      {
        id: "rent",
        name: "Aluguel",
        type: "expense",
        isSystem: false,
        parentId: "home",
        icon: "wallet",
      },
      {
        id: "own",
        name: "Financiamento",
        type: "expense",
        isSystem: false,
        parentId: "home",
        icon: null,
      },
      {
        id: "food",
        name: "Alimentação",
        type: "income",
        isSystem: false,
        parentId: null,
        icon: null,
      },
    ],
    defaults,
  );
  assert.deepEqual(updates, [
    { id: "home", icon: "home" },
    { id: "condo", icon: "building" },
  ]);
});
