// ─────────────────────────────────────────────────────────────────────────────
// QUERY KEY FACTORY
//
// One place that owns every admin cache key. Keys are hierarchical so that
// invalidation can be surgical instead of global:
//
//   ["users"]                                 → everything user-related
//   ["users", "list"]                         → every users list page/filter
//   ["users", "list", { page, search, ... }]  → one exact table view
//   ["users", "detail", id]                   → one user's detail payload
//
// `invalidateQueries({ queryKey: qk.users.lists() })` therefore refreshes all
// cached Users table views and touches nothing on Collections or Transactions —
// the "if a collection is updated, don't reload Users" requirement.
//
// The list key embeds the full filter/pagination shape, so page 2 of a "John"
// search is a genuinely different cache entry from page 1 of the unfiltered
// list. That is what makes Back-navigation restore the *exact* previous view
// rather than a lookalike, and it is why this is not a single global blob that
// could serve one filter's rows under another filter's heading.
// ─────────────────────────────────────────────────────────────────────────────

export interface UsersListParams {
  page: number;
  pageSize: number;
  search: string;
  verification: string;
  sortBy: string;
  sortDir: "asc" | "desc";
}

export interface CollectionsListParams {
  page: number;
  pageSize: number;
  search: string;
  status: string;
  type: string;
  sortBy: string;
  sortDir: "asc" | "desc";
}

export interface TransactionsListParams {
  page: number;
  pageSize: number;
  from: string | null;
  to: string | null;
  type: string;
  status: string;
}

export const qk = {
  users: {
    all: () => ["users"] as const,
    lists: () => ["users", "list"] as const,
    list: (params: UsersListParams) => ["users", "list", params] as const,
    details: () => ["users", "detail"] as const,
    detail: (id: string) => ["users", "detail", id] as const,
    // Detail-only extras that the list never carries (live wallet snapshot).
    wallet: (id: string) => ["users", "detail", id, "wallet-live"] as const,
  },
  collections: {
    all: () => ["collections"] as const,
    lists: () => ["collections", "list"] as const,
    list: (params: CollectionsListParams) =>
      ["collections", "list", params] as const,
    details: () => ["collections", "detail"] as const,
    detail: (id: string) => ["collections", "detail", id] as const,
  },
  transactions: {
    all: () => ["transactions"] as const,
    lists: () => ["transactions", "list"] as const,
    list: (params: TransactionsListParams) =>
      ["transactions", "list", params] as const,
    details: () => ["transactions", "detail"] as const,
    detail: (kind: string, id: string) =>
      ["transactions", "detail", kind, id] as const,
  },
} as const;
