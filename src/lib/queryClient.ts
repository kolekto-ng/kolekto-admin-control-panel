import { QueryClient } from "@tanstack/react-query";

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN QUERY CLIENT
//
// Before this existed, every list page owned its data imperatively (a Zustand
// store or plain useState) and re-ran its fetch from scratch inside
// `useEffect(..., [fetchX])` on every mount. Because each route is a lazily
// loaded chunk that unmounts on navigation, "Users → open a user → Back" ran
// the *entire* users fetch again and flipped `loading` to true, blanking the
// table behind a full-page spinner even though the rows were still in memory.
//
// TanStack Query was already a dependency and the provider was already mounted
// in App.tsx — it just was not used by a single page. It is now the one cache
// for admin server state. Zustand keeps what it is actually good at (auth
// session, UI state); it no longer owns server data for Users/Collections/
// Transactions.
//
// The defaults below are deliberate, not "make the cache long so it stops
// refetching":
//
// staleTime 30s   Admin tables are reviewed, not watched tick-by-tick. Within
//                 30s a Back-navigation is served purely from cache with zero
//                 network. After 30s the cached rows still render instantly and
//                 the refetch happens in the *background* (isFetching), so the
//                 admin never sees a blank table. Detail queries override this.
//
// gcTime 30min    How long an unused cache entry survives. The default 5min is
//                 shorter than a normal admin session, so a page revisited
//                 after a coffee break would cold-start. 30min covers a session
//                 without pinning unbounded memory (entries are small now that
//                 lists are paginated server-side).
//
// refetchOnWindowFocus false
//                 Admins live in alt-tab. Refetching every table on every focus
//                 is precisely the "why is it loading again?" behaviour being
//                 fixed here. Freshness is still covered by staleTime-driven
//                 refetch-on-mount plus explicit invalidation after mutations.
//
// retry 1         The default 3 retries with backoff turns a hard failure into
//                 ~7s of spinner before the error surfaces.
// ─────────────────────────────────────────────────────────────────────────────
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
