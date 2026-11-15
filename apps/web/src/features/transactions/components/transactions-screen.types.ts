import type { AccountOutput } from "@openmonetis/validators/accounts";
import type { CardOutput } from "@openmonetis/validators/cards";
import type { CategoryOutput } from "@openmonetis/validators/categories";
import type { PersonOutput } from "@openmonetis/validators/people";
import type {
  CardInvoiceTotalOutput,
  DailyTransactionSummaryOutput,
  ExportTransactionsQuery,
  RecurringOccurrenceActionInput,
  TransactionActionScope,
  TransactionInput,
  TransactionOutput,
} from "@openmonetis/validators/transactions";

import type { ReactNode } from "react";

import type { PageBreadcrumb } from "@/components/page-header";

import type {
  TransactionDaySummaryOptions,
  TransactionsSearch,
} from "../transactions.presentation";

import type { TransactionCreateDefaults } from "./transaction-form.validation";

export type TransactionsScreenProps = {
  accountStatement?: boolean;
  /** Splits the listing into Despesas / Receitas / Transferências tabs. */
  typeTabs?: boolean;
  transactions: TransactionOutput[];
  /** Sum of every listed item across pages, from the API. */
  totals?: import("./transactions-totals").TransactionsTotalsValue;
  /** Card invoice totals shown in place of card purchases. */
  cardInvoices?: CardInvoiceTotalOutput[];
  /** Per-day consolidation of every matching item, from the API. */
  dailySummaries?: DailyTransactionSummaryOutput[];
  /** Enables day groups with a consolidated footer while sorted by date. */
  daySummary?: TransactionDaySummaryOptions;
  accounts: AccountOutput[];
  cards: CardOutput[];
  categories: CategoryOutput[];
  people: PersonOutput[];
  period: string;
  isLoading: boolean;
  hasLoadError: boolean;
  pendingTransactionId: string | null;
  pendingSettlementKey: string | null;
  pageCount: number;
  totalItems: number;
  onRetry: () => void;
  isUpdating?: boolean;
  onPeriodChange?: (period: string) => void;
  periodNavigationPlacement?: "afterPageHeader" | "afterSummary";
  search: TransactionsSearch;
  onSearchChange: (search: Partial<TransactionsSearch>) => void;
  onDeleteTransaction: (
    transaction: TransactionOutput,
    scope?: TransactionActionScope,
  ) => Promise<void> | void;
  onSettleTransactions: (
    ids: string[],
    isSettled: boolean,
    settledDate?: string,
  ) => Promise<void> | void;
  onSettleRecurringOccurrence: (
    recurringRuleId: string,
    purchaseDate: string,
    isSettled: boolean,
    settledDate?: string,
  ) => Promise<void> | void;
  onRecurringAction: (
    id: string,
    action: RecurringOccurrenceActionInput["action"],
    occurrenceDate: string,
  ) => Promise<void> | void;
  header?: TransactionsScreenHeader;
  hiddenFilters?: readonly TransactionsFilterKey[];
  allowCreate?: boolean;
  allowImport?: boolean;
  onExport?: (format: ExportTransactionsQuery["format"]) => void;
  isExporting?: boolean;
  createDefaults?: TransactionCreateDefaults;
  createTypes?: readonly TransactionCreateType[];
  defaultPageSize?: number;
  contentNavigation?: ReactNode;
  contentOverride?: ReactNode;
};

export type TransactionCreateType = TransactionInput["type"];

export type TransactionsFilterKey =
  | "type"
  | "paymentMethod"
  | "accountCard"
  | "category"
  | "person"
  | "settlement";

export type TransactionsScreenHeader = {
  breadcrumbs: PageBreadcrumb[];
  description?: string;
  icon?: ReactNode;
  summary?: ReactNode;
  title?: string;
};
