export const categoryTypes = ["income", "expense"] as const;
export type CategoryType = (typeof categoryTypes)[number];
export const internalTransferCategoryName = "Transferência interna";
export const invoicePaymentCategoryName = "Pagamentos";
export const balanceAdjustmentCategoryName = "Ajuste de saldo";
export const invoiceAdjustmentCategoryName = "Ajustes de fatura";
export const yieldCategoryName = "Rendimentos";
export const personSettlementCategoryName = "Repasses";
export const otherExpenseCategoryName = "Outras despesas";
export const otherIncomeCategoryName = "Outras receitas";

export type CategoryCreateDraft = {
  userId: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  isSystem: boolean;
  parentId?: string | null;
  id?: string;
  /** Order among siblings (same type and parent); appended at the end when omitted. */
  position?: number;
};

export type CategoryHierarchyNode = {
  id: string;
  type: CategoryType;
  parentId?: string | null;
  isSystem: boolean;
};

export class CategoryConstraintError extends Error {
  constructor(
    public readonly code:
      | "category_invalid_parent"
      | "category_has_children"
      | "category_name_conflict"
      | "category_in_use"
      | "category_invalid_order",
  ) {
    super(code);
  }
}

export function assertCategoryHierarchy(input: {
  id?: string;
  type: CategoryType;
  parentId: string | null;
  categories: readonly CategoryHierarchyNode[];
}) {
  const children = input.categories.filter(
    (category) => category.parentId === input.id && input.id !== undefined,
  );
  if (
    children.length &&
    (input.parentId !== null || children.some((child) => child.type !== input.type))
  ) {
    throw new CategoryConstraintError("category_has_children");
  }
  if (!input.parentId) return;
  const parent = input.categories.find((category) => category.id === input.parentId);
  if (
    !parent ||
    parent.id === input.id ||
    parent.parentId ||
    parent.isSystem ||
    parent.type !== input.type
  ) {
    throw new CategoryConstraintError("category_invalid_parent");
  }
}

export function expandCategoryIds(
  categories: readonly Pick<CategoryHierarchyNode, "id" | "parentId">[],
  selectedIds: readonly string[],
) {
  const selected = new Set(selectedIds);
  return [
    ...new Set([
      ...selectedIds,
      ...categories
        .filter((category) => category.parentId && selected.has(category.parentId))
        .map((category) => category.id),
    ]),
  ];
}

export function createCategoryDraft(
  input: Omit<CategoryCreateDraft, "isSystem">,
): CategoryCreateDraft {
  return {
    ...input,
    name: input.name.trim(),
    icon: input.icon?.trim() || null,
    isSystem: false,
  };
}

export function canChangeCategoryType(input: {
  currentType: CategoryType;
  nextType: CategoryType;
  hasFinancialReferences: boolean;
}) {
  return input.currentType === input.nextType || !input.hasFinancialReferences;
}

type DefaultSubcategory = readonly [name: string, icon: string];

type DefaultCategoryDefinition = {
  name: string;
  type: CategoryType;
  icon: string;
  /** System categories back automatic flows (balance adjustments, invoices, settlements). */
  isSystem?: boolean;
  subcategories?: readonly DefaultSubcategory[];
};

/**
 * Categories every new account starts with. System categories and the names exported above are
 * referenced by code (account yields, invoice payments, settlements, transfers), so they keep
 * their exact names. A system category never has subcategories.
 */
const defaultCategoryDefinitions: readonly DefaultCategoryDefinition[] = [
  {
    name: balanceAdjustmentCategoryName,
    type: "expense",
    icon: "circle-dollar-sign",
    isSystem: true,
  },
  { name: invoicePaymentCategoryName, type: "expense", icon: "receipt", isSystem: true },
  {
    name: invoiceAdjustmentCategoryName,
    type: "expense",
    icon: "receipt-text",
    isSystem: true,
  },
  {
    name: "Moradia",
    type: "expense",
    icon: "home",
    subcategories: [
      ["Aluguel", "building"],
      ["Condomínio", "building"],
      ["Energia elétrica", "zap"],
      ["Água", "droplets"],
      ["Gás", "flame"],
      ["Internet", "wifi"],
      ["Telefone", "phone"],
      ["IPTU", "receipt-text"],
      ["Manutenção", "hammer"],
      ["Móveis", "armchair"],
      ["Eletrodomésticos", "refrigerator"],
      ["Decoração", "sofa"],
      ["Limpeza", "spray-can"],
    ],
  },
  {
    name: "Alimentação",
    type: "expense",
    icon: "utensils",
    subcategories: [
      ["Supermercado", "shopping-cart"],
      ["Feira / Hortifruti", "carrot"],
      ["Padaria", "croissant"],
      ["Restaurante", "restaurant"],
      ["Delivery", "motorbike"],
      ["Lanches", "sandwich"],
      ["Cafés", "coffee"],
      ["Bebidas", "martini"],
      ["Alimentação no trabalho", "hamburger"],
    ],
  },
  {
    name: "Transporte",
    type: "expense",
    icon: "car",
    subcategories: [
      ["Combustível", "fuel"],
      ["Uber / 99", "taxi"],
      ["Transporte público", "bus"],
      ["Estacionamento", "parking"],
      ["Pedágio", "milestone"],
      ["Manutenção", "wrench"],
      ["Seguro", "shield"],
      ["IPVA", "receipt"],
      ["Licenciamento", "file-text"],
      ["Lavagem", "spray-can"],
      ["Multas", "triangle-alert"],
      ["Parcela do veículo", "badge-dollar-sign"],
    ],
  },
  {
    name: "Financeiro",
    type: "expense",
    icon: "credit-card",
    subcategories: [
      ["Tarifas bancárias", "landmark"],
      ["Juros", "percent"],
      ["IOF", "coins"],
      ["Multas / encargos", "triangle-alert"],
      ["Empréstimos", "hand-coins"],
      ["Financiamentos", "banknote"],
    ],
  },
  {
    name: "Compras",
    type: "expense",
    icon: "shopping-cart",
    subcategories: [
      ["Roupas", "shirt"],
      ["Calçados", "shopping-bag"],
      ["Eletrônicos", "monitor-smartphone"],
      ["Casa", "armchair"],
      ["Acessórios", "watch"],
      ["Presentes", "gift"],
      ["Compras online", "package"],
      ["Outros", "more-horizontal"],
    ],
  },
  {
    name: "Cartões de crédito",
    type: "expense",
    icon: "credit-card",
    subcategories: [
      ["Anuidade", "credit-card"],
      ["Adiantamento fatura", "badge-dollar-sign"],
      ["Ajustes", "refresh-cw"],
      ["Estornos", "undo"],
      ["Outros", "tag"],
    ],
  },
  {
    name: "Saúde",
    type: "expense",
    icon: "hospital",
    subcategories: [
      ["Plano de saúde", "shield-plus"],
      ["Consultas", "stethoscope"],
      ["Exames", "activity"],
      ["Medicamentos", "pill"],
      ["Dentista", "bandage"],
      ["Óculos", "glasses"],
      ["Terapias", "brain"],
      ["Academia / atividade física", "dumbbell"],
    ],
  },
  {
    name: "Lazer e Entretenimento",
    type: "expense",
    icon: "gamepad",
    subcategories: [
      ["Cinema", "clapperboard"],
      ["Shows / eventos", "drama"],
      ["Jogos", "gamepad"],
      ["Streaming", "circle-play"],
      ["Restaurantes / bares", "martini"],
      ["Viagens", "luggage"],
      ["Hobbies", "palette"],
      ["Passeios", "ferris-wheel"],
      ["Assinaturas", "repeat"],
    ],
  },
  {
    name: "Tecnologia e Assinaturas",
    type: "expense",
    icon: "smartphone",
    subcategories: [
      ["Celular", "smartphone"],
      ["Aplicativos", "layout-grid"],
      ["Software", "code"],
      ["Cloud / armazenamento", "cloud"],
      ["Streaming", "circle-play"],
      ["Serviços digitais", "monitor-smartphone"],
      ["Assinaturas profissionais", "briefcase"],
    ],
  },
  {
    name: "Cuidados Pessoais",
    type: "expense",
    icon: "smile",
    subcategories: [
      ["Barbearia / cabeleireiro", "scissors"],
      ["Cosméticos", "brush"],
      ["Higiene pessoal", "bath"],
      ["Roupas", "shirt"],
      ["Estética", "flower"],
      ["Academia", "dumbbell"],
      ["Outros", "circle-help"],
    ],
  },
  {
    name: "Educação",
    type: "expense",
    icon: "graduation-cap",
    subcategories: [
      ["Cursos", "graduation-cap"],
      ["Faculdade / escola", "school"],
      ["Livros", "book-open"],
      ["Material escolar", "backpack"],
      ["Certificações", "medal"],
      ["Cursos online", "monitor-play"],
      ["Idiomas", "languages"],
    ],
  },
  {
    name: "Viagens",
    type: "expense",
    icon: "plane",
    subcategories: [
      ["Passagens", "plane"],
      ["Hospedagem", "bed-double"],
      ["Alimentação", "utensils"],
      ["Transporte", "car"],
      ["Passeios", "mountain"],
      ["Compras", "shopping-bag"],
      ["Seguro viagem", "shield"],
    ],
  },
  {
    name: "Pets",
    type: "expense",
    icon: "paw-print",
    subcategories: [
      ["Alimentação", "shopping-cart"],
      ["Veterinário", "hospital"],
      ["Medicamentos", "pill"],
      ["Higiene", "bath"],
      ["Banho / tosa", "scissors"],
      ["Brinquedos", "dog"],
      ["Acessórios", "tag"],
    ],
  },
  {
    name: "Família",
    type: "expense",
    icon: "users",
    subcategories: [
      ["Ajuda familiar", "hand-heart"],
      ["Filhos", "baby"],
      ["Pais", "person-standing"],
      ["Pensões", "banknote"],
      ["Presentes", "gift"],
      ["Outras despesas familiares", "circle-help"],
    ],
  },
  {
    name: "Impostos e Obrigações",
    type: "expense",
    icon: "receipt-text",
    subcategories: [
      ["Imposto de renda", "gavel"],
      ["Taxas", "percent"],
      ["Documentação", "file-text"],
      ["Multas", "triangle-alert"],
      ["Serviços públicos", "plug"],
      ["Outras obrigações", "circle-help"],
    ],
  },
  {
    name: "Doações",
    type: "expense",
    icon: "heart",
    subcategories: [
      ["Doações", "hand-heart"],
      ["Presentes", "gift"],
      ["Contribuições", "heart"],
      ["Ações sociais", "users-round"],
    ],
  },
  {
    name: "Empresa",
    type: "expense",
    icon: "factory",
    subcategories: [
      ["INSS", "landmark"],
      ["Simples", "receipt-text"],
      ["Taxas", "percent"],
      ["Seguro de vida", "shield"],
      ["Outros", "circle-help"],
    ],
  },
  {
    name: otherExpenseCategoryName,
    type: "expense",
    icon: "more-horizontal",
    subcategories: [["Despesas diversas", "shapes"]],
  },
  {
    name: "Salário e Trabalho",
    type: "income",
    icon: "briefcase",
    subcategories: [
      ["Salário", "banknote"],
      ["Adicional / Hora extra", "clock-plus"],
      ["PLR / Bônus", "star"],
      ["Comissão", "percent"],
      ["Férias", "umbrella"],
      ["13º salário", "calendar"],
      ["Rescisão", "file-text"],
    ],
  },
  {
    name: "Renda Extra",
    type: "income",
    icon: "hand-coins",
    subcategories: [
      ["Freelance", "laptop"],
      ["Serviços", "wrench"],
      ["Venda de produtos", "tags"],
      ["Trabalho eventual", "hard-hat"],
      ["Gorjetas", "coins"],
    ],
  },
  {
    name: "Investimentos",
    type: "income",
    icon: "chart",
    subcategories: [
      ["Dividendos", "trending-up"],
      ["Juros", "percent"],
      // Account yields are booked into this category by name; see `yieldCategoryName`.
      [yieldCategoryName, "piggy-bank"],
      ["Aluguéis", "building"],
      ["Resgate de investimentos", "wallet"],
      ["Venda de ativos", "tags"],
    ],
  },
  {
    name: "Transferências / Reembolsos",
    type: "income",
    icon: "arrow-left-right",
    subcategories: [
      ["Reembolso de despesas", "refresh-cw"],
      ["Devolução de compra", "undo"],
      ["Transferência recebida", "arrow-down-left"],
      ["Empréstimo recebido", "hand-coins"],
    ],
  },
  {
    name: otherIncomeCategoryName,
    type: "income",
    icon: "gift",
    subcategories: [
      ["Presente recebido", "gift"],
      ["Cashback", "badge-percent"],
      ["Prêmios", "trophy"],
      ["Receitas diversas", "more-horizontal"],
    ],
  },
  { name: personSettlementCategoryName, type: "income", icon: "hand-coins", isSystem: true },
  {
    name: balanceAdjustmentCategoryName,
    type: "income",
    icon: "circle-dollar-sign",
    isSystem: true,
  },
  {
    name: internalTransferCategoryName,
    type: "income",
    icon: "arrow-left-right",
    isSystem: true,
  },
];

/**
 * Drafts for the default categories, each parent before its subcategories. Ids are assigned up
 * front through `createId`, so subcategories reference their parent within a single insert.
 */
export function createDefaultCategoryDrafts(
  userId: string,
  createId: () => string,
): CategoryCreateDraft[] {
  // New accounts list each level alphabetically, like the order existing accounts started with.
  const alphabeticalIndex = (names: string[], name: string) =>
    [...names].sort((left, right) => left.localeCompare(right, "pt-BR")).indexOf(name);
  return defaultCategoryDefinitions.flatMap((category) => {
    const parentId = createId();
    const rootNames = defaultCategoryDefinitions
      .filter((item) => item.type === category.type)
      .map((item) => item.name);
    const childNames = (category.subcategories ?? []).map(([name]) => name);
    return [
      {
        id: parentId,
        userId,
        name: category.name,
        type: category.type,
        icon: category.icon,
        isSystem: category.isSystem ?? false,
        parentId: null,
        position: alphabeticalIndex(rootNames, category.name),
      },
      ...(category.subcategories ?? []).map(([name, icon]) => ({
        id: createId(),
        userId,
        name,
        type: category.type,
        icon,
        isSystem: false,
        parentId,
        position: alphabeticalIndex(childNames, name),
      })),
    ];
  });
}

export type ExistingCategory = {
  id: string;
  name: string;
  type: CategoryType;
  isSystem: boolean;
  parentId?: string | null;
  position?: number;
};

/**
 * The default categories an existing account is still missing, ready to insert. Nothing existing is
 * renamed, moved or removed: a default whose name already exists at the same level (ignoring case)
 * is reused, and its missing subcategories are attached to it. Subcategories are never added under
 * a system category, and the account-yield category is only added when no category of that name
 * exists yet, so yields keep going to the one the account already uses.
 */
export function selectMissingDefaultCategories(
  existing: readonly ExistingCategory[],
  defaults: readonly CategoryCreateDraft[],
): CategoryCreateDraft[] {
  const normalize = (name: string) => name.trim().toLocaleLowerCase("pt-BR");
  const keyOf = (type: CategoryType, parentId: string | null | undefined, name: string) =>
    `${type}|${parentId ?? ""}|${normalize(name)}`;
  const existingByKey = new Map(
    existing.map((category) => [keyOf(category.type, category.parentId, category.name), category]),
  );
  const hasYieldCategory = existing.some(
    (category) =>
      category.type === "income" && normalize(category.name) === normalize(yieldCategoryName),
  );
  const resolvedParentIds = new Map<string, { id: string; isSystem: boolean }>();
  const missing: CategoryCreateDraft[] = [];

  for (const draft of defaults) {
    if (!draft.parentId) {
      const match = existingByKey.get(keyOf(draft.type, null, draft.name));
      if (draft.id) {
        resolvedParentIds.set(draft.id, {
          id: match?.id ?? draft.id,
          isSystem: match?.isSystem ?? draft.isSystem,
        });
      }
      if (!match) missing.push(draft);
      continue;
    }
    const parent = resolvedParentIds.get(draft.parentId);
    if (!parent || parent.isSystem) continue;
    if (draft.type === "income" && normalize(draft.name) === normalize(yieldCategoryName)) {
      if (hasYieldCategory) continue;
    }
    if (existingByKey.has(keyOf(draft.type, parent.id, draft.name))) continue;
    missing.push({ ...draft, parentId: parent.id });
  }
  // What is added goes after what the account already has at each level, in the default order.
  const nextPosition = new Map<string, number>();
  const levelOf = (type: CategoryType, parentId: string | null | undefined) =>
    `${type}|${parentId ?? ""}`;
  for (const category of existing) {
    const level = levelOf(category.type, category.parentId);
    nextPosition.set(level, Math.max(nextPosition.get(level) ?? 0, (category.position ?? 0) + 1));
  }
  return missing.map((draft) => {
    const level = levelOf(draft.type, draft.parentId);
    if (!nextPosition.has(level)) return draft;
    const position = nextPosition.get(level) as number;
    nextPosition.set(level, position + 1);
    return { ...draft, position };
  });
}

/**
 * Existing categories that are neither a system category nor part of the default list, listed
 * subcategories first so each parent is only removed after its children. A subcategory only counts
 * as a default when it sits under the matching default category.
 */
export function selectNonDefaultCategories(
  existing: readonly ExistingCategory[],
  defaults: readonly CategoryCreateDraft[],
): ExistingCategory[] {
  const normalize = (name: string) => name.trim().toLocaleLowerCase("pt-BR");
  const defaultRoots = new Map<string, Set<string>>();
  for (const draft of defaults) {
    if (draft.parentId) continue;
    const children = defaults
      .filter((child) => child.parentId === draft.id)
      .map((child) => normalize(child.name));
    defaultRoots.set(`${draft.type}|${normalize(draft.name)}`, new Set(children));
  }
  const byId = new Map(existing.map((category) => [category.id, category]));
  const isDefault = (category: ExistingCategory) => {
    if (category.isSystem) return true;
    if (!category.parentId) return defaultRoots.has(`${category.type}|${normalize(category.name)}`);
    const parent = byId.get(category.parentId);
    if (!parent || parent.parentId) return false;
    return (
      defaultRoots.get(`${parent.type}|${normalize(parent.name)}`)?.has(normalize(category.name)) ??
      false
    );
  };
  const extras = existing.filter((category) => !isDefault(category));
  return [
    ...extras.filter((category) => category.parentId),
    ...extras.filter((category) => !category.parentId),
  ];
}

/**
 * A new order for one level (same type and parent) must list each of its categories exactly once.
 */
export function assertCategoryOrder(siblingIds: readonly string[], orderedIds: readonly string[]) {
  const siblings = new Set(siblingIds);
  const ordered = new Set(orderedIds);
  if (
    ordered.size !== orderedIds.length ||
    ordered.size !== siblings.size ||
    orderedIds.some((id) => !siblings.has(id))
  ) {
    throw new CategoryConstraintError("category_invalid_order");
  }
}
