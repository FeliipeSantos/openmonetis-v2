import type {
  CardInvoiceTotalOutput,
  RecurringOccurrenceActionInput,
  TransactionActionScope,
  TransactionOutput,
} from "@openmonetis/validators/transactions";
import type { TransactionDayGrouping } from "./transaction-day-summary";

export type TransactionsTableProps = {
  accountStatement?: boolean;
  adminPersonId: string | null;
  /** Card invoice totals shown above the itemized rows. */
  cardInvoices?: CardInvoiceTotalOutput[];
  /** Sum of every listed item across pages. */
  totals?: import("./transactions-totals").TransactionsTotalsValue;
  /** Shows the totals without sign (single-type listings). */
  totalsUnsigned?: boolean;
  /** Colors the total by the listed type (e.g. red for expenses). */
  totalsTone?: import("./transactions-totals").TransactionsTotalsTone;
  /** Groups rows by day with a consolidated footer per day. */
  dayGrouping?: TransactionDayGrouping;
  selectionMode?: boolean;
  transactions: TransactionOutput[];
  pendingTransactionId: string | null;
  pendingSettlementKey: string | null;
  onEdit: (transaction: TransactionOutput) => void;
  onView: (transaction: TransactionOutput) => void;
  onDelete: (transaction: TransactionOutput, scope?: TransactionActionScope) => void;
  onCopy: (transaction: TransactionOutput) => void;
  onAnticipate: (transaction: TransactionOutput) => void;
  onUndoAnticipation: (transaction: TransactionOutput) => void;
  onRefund: (transaction: TransactionOutput) => void;
  onSettle: (ids: string[], isSettled: boolean) => void;
  onSettleRecurringOccurrence: (
    recurringRuleId: string,
    purchaseDate: string,
    isSettled: boolean,
  ) => void;
  onRecurringAction: (
    id: string,
    action: RecurringOccurrenceActionInput["action"],
    occurrenceDate: string,
  ) => Promise<void> | void;
  currentPage: number;
  pageCount: number;
  pageSize: number;
  period: string;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export type TransactionRowProps = {
  accountStatement: boolean;
  adminPersonId: string | null;
  selectionMode: boolean;
  selected: boolean;
  selectable: boolean;
  splitConnector: "start" | "middle" | "end" | null;
  transaction: TransactionOutput;
  pending: boolean;
  period: string;
  settlementPending: boolean;
  onEdit: (transaction: TransactionOutput) => void;
  onView: (transaction: TransactionOutput) => void;
  onDelete: (transaction: TransactionOutput, scope?: TransactionActionScope) => void;
  onCopy: (transaction: TransactionOutput) => void;
  onAnticipate: (transaction: TransactionOutput) => void;
  onUndoAnticipation: (transaction: TransactionOutput) => void;
  onRefund: (transaction: TransactionOutput) => void;
  onRecurringAction: (
    id: string,
    action: RecurringOccurrenceActionInput["action"],
    occurrenceDate: string,
  ) => Promise<void> | void;
  onSettle: (ids: string[], isSettled: boolean) => void;
  onSettleRecurringOccurrence: (
    recurringRuleId: string,
    purchaseDate: string,
    isSettled: boolean,
  ) => void;
  onSelectionChange: (selected: boolean, extendRange: boolean) => void;
};
