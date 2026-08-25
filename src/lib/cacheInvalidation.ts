import { queryClient } from "@/lib/queryClient";
import { qk } from "@/lib/queryKeys";

// ─────────────────────────────────────────────────────────────────────────────
// SCOPED CACHE INVALIDATION
//
// The point of the hierarchical keys in queryKeys.ts is that a write can
// refresh exactly what it affected. These helpers are the vocabulary for that,
// and they exist as plain functions (not hooks) because the mutation sites that
// need them are Zustand stores, outside the React tree — which is precisely why
// `queryClient` is exported as a module singleton rather than created inline in
// App.tsx.
//
// The rule this encodes: never reach for `queryClient.invalidateQueries()` with
// no key. That nukes every cached page in the panel and reintroduces the
// full-reload behaviour this work removed. Invalidate the entity you touched.
//
// Invalidation marks entries stale rather than deleting them, so an affected
// page still renders its existing rows immediately and refreshes underneath —
// consistent with how navigation now behaves.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A user's own data changed (KYC decision, profile edit).
 *
 * Refreshes every cached Users *list* view — the verification badge and the
 * verification filter are both derived from KYC state, so a decision can change
 * which page a user even appears on — plus that user's detail entry. Collections
 * and Transactions are untouched.
 */
export function invalidateUser(userId?: string) {
  queryClient.invalidateQueries({ queryKey: qk.users.lists() });
  if (userId) {
    queryClient.invalidateQueries({ queryKey: qk.users.detail(userId) });
  }
}

/**
 * A collection changed (status transition, edit, delete).
 *
 * Campaign status transitions update the `collections` row as well as
 * `campaigns` in one atomic backend call, so the Collections table is stale
 * even when the admin performed the action from the Fundraising screen.
 */
export function invalidateCollection(collectionId?: string) {
  queryClient.invalidateQueries({ queryKey: qk.collections.lists() });
  queryClient.invalidateQueries({
    queryKey: [...qk.collections.all(), "type-counts"],
  });
  if (collectionId) {
    queryClient.invalidateQueries({
      queryKey: qk.collections.detail(collectionId),
    });
  }
}

/**
 * Money moved (withdrawal decision, reconciliation, contribution adjustment).
 *
 * Transactions is the merged contributions+withdrawals view; a withdrawal
 * decision also changes the owning collection's wallet figures, so both are
 * refreshed. Users lists are not — they carry no financial columns.
 */
export function invalidateTransactions(collectionId?: string) {
  queryClient.invalidateQueries({ queryKey: qk.transactions.lists() });
  queryClient.invalidateQueries({ queryKey: qk.collections.lists() });
  if (collectionId) {
    queryClient.invalidateQueries({
      queryKey: qk.collections.detail(collectionId),
    });
  }
}
