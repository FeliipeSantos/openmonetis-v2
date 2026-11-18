import { createFileRoute } from "@tanstack/react-router";
import { AccountStatementPage } from "@/features/accounts/components/account-statement-page";
import {
  type TransactionsSearch,
  validateTransactionsSearch,
} from "@/features/transactions/transactions.presentation";

export const Route = createFileRoute("/accounts_/$accountId")({
  head: () => ({ meta: [{ title: "Extrato da conta · OpenMonetis" }] }),
  component: AccountStatementRoute,
  validateSearch: validateAccountStatementSearch,
});

function AccountStatementRoute() {
  const { accountId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <AccountStatementPage
      accountId={accountId}
      onSearchChange={(nextSearch) =>
        navigate({
          replace: true,
          // Search, filters and paging update the URL in place; keep the reader where they are.
          resetScroll: false,
          search: (previous) => ({ ...previous, ...nextSearch }),
        })
      }
      search={search}
    />
  );
}

function validateAccountStatementSearch(search: Record<string, unknown>): TransactionsSearch {
  const { accounts, cards, ...statementSearch } = validateTransactionsSearch(search);

  return statementSearch;
}
