import { CircleDollarSign } from "lucide-react";
import { Fragment } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  getTransactionListingDate,
  groupTransactionRows,
  groupTransactionsByDay,
} from "../transactions.presentation";
import { useTransactionSelection } from "../useTransactionSelection";
import { TransactionBulkActionDock } from "./transaction-bulk-action-dock";
import { CardInvoiceTotalRow } from "./transaction-card-invoice-total";
import { TransactionDayHeaderRow, TransactionDaySummaryRows } from "./transaction-day-summary";
import { TransactionRow } from "./transaction-row";
import { TransactionsPagination } from "./transactions-pagination";
import type { TransactionsTableProps } from "./transactions-table.types";

/** Columns after "Valor": Condição, Forma, Conta/Cartão, Situação, Ações. */
const TRAILING_COLUMNS = 5;

export function TransactionsTable({
  accountStatement = false,
  adminPersonId,
  cardInvoices = [],
  totals,
  totalsUnsigned,
  totalsTone,
  dayGrouping,
  selectionMode = false,
  transactions,
  pendingTransactionId,
  pendingSettlementKey,
  onEdit,
  onView,
  onDelete,
  onCopy,
  onAnticipate,
  onUndoAnticipation,
  onRefund,
  onSettle,
  onSettleRecurringOccurrence,
  onRecurringAction,
  currentPage,
  pageCount,
  pageSize,
  period,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: TransactionsTableProps) {
  const rows = groupTransactionRows(transactions);
  // Purchases matched by a search are shown right under their card invoice total.
  const invoiceRows = new Map(
    cardInvoices.map((invoice) => [
      `${invoice.cardId}:${invoice.period}`,
      groupTransactionRows(invoice.matchedItems),
    ]),
  );
  // Selection follows the rendered order so Shift+click ranges match what the user sees.
  const selection = useTransactionSelection([
    ...rows.map((row) => row.transaction),
    ...[...invoiceRows.values()].flat().map((row) => row.transaction),
  ]);
  const columnCount = (selectionMode ? 1 : 0) + 2 + TRAILING_COLUMNS;

  function renderRow({ transaction, splitConnector }: (typeof rows)[number]) {
    return (
      <TransactionRow
        accountStatement={accountStatement}
        adminPersonId={adminPersonId}
        key={transaction.id}
        selectionMode={selectionMode}
        selected={selection.isSelected(transaction.id)}
        selectable={selection.isSelectable(transaction)}
        splitConnector={splitConnector}
        onEdit={onEdit}
        onView={onView}
        onDelete={onDelete}
        onCopy={onCopy}
        onAnticipate={onAnticipate}
        onUndoAnticipation={onUndoAnticipation}
        onRefund={onRefund}
        onRecurringAction={onRecurringAction}
        onSettle={onSettle}
        onSettleRecurringOccurrence={onSettleRecurringOccurrence}
        onSelectionChange={(selected, extendRange) =>
          selection.setSelected(transaction.id, selected, extendRange)
        }
        pending={pendingTransactionId !== null && pendingTransactionId === transaction.recordId}
        period={period}
        settlementPending={
          pendingSettlementKey ===
          (transaction.recordId ??
            (transaction.recurringRuleId
              ? `${transaction.recurringRuleId}:${transaction.purchaseDate}`
              : null))
        }
        transaction={transaction}
      />
    );
  }

  /** Card invoice totals placed by the API right before a row (or at the end, for `null`). */
  function renderCardInvoices(beforeTransactionId: string | null) {
    return cardInvoices
      .filter((invoice) => invoice.beforeTransactionId === beforeTransactionId)
      .map((invoice) => {
        const key = `${invoice.cardId}:${invoice.period}`;
        return (
          <Fragment key={key}>
            <CardInvoiceTotalRow invoice={invoice} selectionMode={selectionMode} />
            {invoiceRows.get(key)?.map(renderRow)}
          </Fragment>
        );
      });
  }

  return (
    <TooltipProvider>
      <div className="grid gap-3">
        <Card className="py-2">
          <CardContent className="px-2 sm:px-4">
            {transactions.length || cardInvoices.length ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {selectionMode ? (
                          <TableHead className="font-mono w-10">
                            <Checkbox
                              aria-label="Selecionar lançamentos operacionais desta página"
                              checked={selection.allSelectableSelected}
                              disabled={!selection.selectableCount}
                              onCheckedChange={selection.setAllSelectableSelected}
                            />
                          </TableHead>
                        ) : null}
                        <TableHead className="font-mono">Descrição</TableHead>
                        <TableHead className="font-mono text-right">Valor</TableHead>
                        <TableHead className="font-mono pl-5">Condição</TableHead>
                        <TableHead className="font-mono">Forma</TableHead>
                        <TableHead className="font-mono">Conta/Cartão</TableHead>
                        <TableHead className="font-mono">Situação</TableHead>
                        <TableHead className="font-mono w-14 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dayGrouping
                        ? groupTransactionsByDay(rows, (row) =>
                            getTransactionListingDate(row.transaction, accountStatement),
                          ).map((group) => (
                            <Fragment key={group.date}>
                              <TransactionDayHeaderRow columns={columnCount} date={group.date} />
                              {group.items.map(renderRow)}
                              <TransactionDaySummaryRows
                                date={group.date}
                                grouping={dayGrouping}
                                leadingColumns={selectionMode ? 1 : 0}
                                trailingColumns={TRAILING_COLUMNS}
                              />
                            </Fragment>
                          ))
                        : rows.map((row) => (
                            <Fragment key={row.transaction.id}>
                              {renderCardInvoices(row.transaction.id)}
                              {renderRow(row)}
                            </Fragment>
                          ))}
                      {renderCardInvoices(null)}
                    </TableBody>
                  </Table>
                </div>
                <TransactionsPagination
                  totals={totals}
                  totalsUnsigned={totalsUnsigned}
                  totalsTone={totalsTone}
                  totalItems={totalItems}
                  currentPage={currentPage}
                  pageCount={pageCount}
                  pageSize={pageSize}
                  onPageChange={onPageChange}
                  onPageSizeChange={onPageSizeChange}
                />
              </>
            ) : (
              <div className="grid place-items-center px-4 py-14 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-brand/10 text-brand-strong">
                  <CircleDollarSign className="size-6" />
                </span>
                <h2 className="mt-4 font-semibold">Nenhum lançamento encontrado</h2>
                <p className="mt-1 max-w-sm text-muted-foreground text-sm">
                  Ajuste os filtros ou cadastre um novo lançamento para visualizar aqui.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <TransactionBulkActionDock
          onClear={selection.clear}
          summary={selection.summary}
          transactions={selection.selectedTransactions}
        />
      </div>
    </TooltipProvider>
  );
}
