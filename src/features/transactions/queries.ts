import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { qk, type TransactionsListParams } from "@/lib/queryKeys";
import type { Transaction } from "@/stores/dashboardStore";
import type { Page } from "@/lib/pagination";
import { fetchTransactionsPage } from "./api";

export function useTransactionsList(params: TransactionsListParams) {
  return useQuery<Page<Transaction>>({
    queryKey: qk.transactions.list(params),
    queryFn: () => fetchTransactionsPage(params),
    placeholderData: keepPreviousData,
    // Money is the most volatile data in the panel; keep it fresher than the
    // 30s default so a background refresh happens more eagerly. Cached rows
    // still render instantly — this only affects when the silent refetch fires.
    staleTime: 15_000,
  });
}
