import {
  keepPreviousData,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { qk, type UsersListParams } from "@/lib/queryKeys";
import { fetchUsersPage, type UserRow } from "./api";
import type { Page } from "@/lib/pagination";
import {
  fetchUserDetail,
  fetchUserWalletLive,
  type LiveWalletStats,
  type UserDetail,
} from "./detailApi";

/**
 * Users table, one page at a time.
 *
 * `placeholderData: keepPreviousData` is what stops the table flashing empty
 * when the admin steps to page 2 or edits a filter: the previous page stays on
 * screen, marked as fetching, until the new one arrives.
 */
export function useUsersList(params: UsersListParams) {
  return useQuery<Page<UserRow>>({
    queryKey: qk.users.list(params),
    queryFn: () => fetchUsersPage(params),
    placeholderData: keepPreviousData,
  });
}

/**
 * Find a user's row in whatever Users list pages are already cached.
 *
 * This is the master → detail handoff. If the admin reached the detail page by
 * clicking a row, that row is by definition sitting in the cache, so the header
 * (name, email, phone, join date, verification) can render on the very first
 * frame instead of behind a spinner. Nothing here *replaces* the detail fetch —
 * it only removes the blank gap in front of it.
 */
export function findCachedUserRow(
  client: QueryClient,
  id: string,
): UserRow | undefined {
  const entries = client.getQueriesData<Page<UserRow>>({
    queryKey: qk.users.lists(),
  });
  for (const [, page] of entries) {
    const hit = page?.rows.find((row) => row.id === id);
    if (hit) return hit;
  }
  return undefined;
}

export function useUserDetail(id: string | undefined) {
  const client = useQueryClient();

  return useQuery<UserDetail>({
    queryKey: qk.users.detail(id ?? ""),
    queryFn: () => fetchUserDetail(id as string),
    enabled: Boolean(id),
    // Seed the parts the list already knows so the page paints instantly on a
    // row click. Marked as placeholder data (not `initialData`) so React Query
    // still treats the entry as empty and fetches the full record immediately —
    // this shows known fields sooner, it does not skip the request or let a
    // partial record be mistaken for a complete one.
    placeholderData: () => {
      if (!id) return undefined;
      const row = findCachedUserRow(client, id);
      if (!row) return undefined;
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        joinDate: row.joinDate,
        verificationStatus: row.verificationStatus,
        collections: [],
        withdrawals: [],
        cachedTotals: {
          availableBalance: 0,
          accountBalance: 0,
          pendingBalance: 0,
          totalRaised: 0,
          totalWithdrawn: 0,
          pendingWithdrawal: 0,
        },
      } satisfies UserDetail;
    },
  });
}

/**
 * Live wallet snapshot — a sibling query so it runs in parallel with the
 * profile fetch rather than after it. Money moves, so this one is kept short-
 * lived rather than inheriting the 30s list staleTime.
 */
export function useUserWalletLive(id: string | undefined) {
  return useQuery<LiveWalletStats | null>({
    queryKey: qk.users.wallet(id ?? ""),
    queryFn: () => fetchUserWalletLive(id as string),
    enabled: Boolean(id),
    staleTime: 10_000,
  });
}
