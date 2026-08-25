import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

// ─────────────────────────────────────────────────────────────────────────────
// URL-BACKED LIST STATE
//
// The old pages held search / filters / page in component-local useState. Route
// components unmount on navigation, so "Users → search 'John' → open John →
// Back" reconstructed the page with empty state: the search box was blank, the
// filter was reset and the admin was on page 1 of the unfiltered list.
//
// Putting that state in the query string fixes it at the source instead of
// bolting a snapshot cache on the side:
//
//   1. Back is restored by the *router*. The history entry already holds
//      `?q=John&verification=verified&page=2`, so returning to it rebuilds the
//      exact view with no bespoke restore logic and no chance of drifting out
//      of sync with what was actually on screen.
//   2. The same params form the React Query key, so the restored view hits the
//      cache entry that was populated on the way out — instant render, no
//      loading state.
//   3. The view becomes linkable and reloadable, which the old local state
//      could never be.
//
// Filter/search edits use history.replace so a 5-character search does not push
// 5 entries the admin has to Back through; navigating to a detail page pushes
// normally, so one Back returns to the list.
// ─────────────────────────────────────────────────────────────────────────────

/** Debounce a rapidly-changing value (search input) before it reaches a query key. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (Object.is(value, debounced)) return;
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
    // `debounced` intentionally omitted: including it would restart the timer
    // when the debounced value lands, which is a no-op loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delayMs]);

  return debounced;
}

export interface ListParamsResult<TFilters extends Record<string, string>> {
  /** Committed filters — safe to put in a query key. */
  filters: TFilters;
  /** 1-based page number. */
  page: number;
  /** Update one or more filters. Always returns to page 1. */
  setFilters: (patch: Partial<TFilters>) => void;
  setPage: (page: number) => void;
  /** True when anything differs from the defaults. */
  isFiltered: boolean;
}

/**
 * Sync a set of list filters + pagination with the URL query string.
 *
 * Values equal to their default are omitted from the URL, keeping the common
 * case (`/users`) clean and making the default view a single cache key rather
 * than one per redundant spelling of "no filters".
 */
export function useListParams<TFilters extends Record<string, string>>(
  defaults: TFilters,
): ListParamsResult<TFilters> {
  const [searchParams, setSearchParams] = useSearchParams();

  // Defaults are declared inline at call sites; freeze the first one so the
  // memo below does not re-run on every render because of a new object identity.
  const defaultsRef = useRef(defaults);

  const filters = useMemo(() => {
    const out = {} as TFilters;
    for (const key of Object.keys(defaultsRef.current) as (keyof TFilters)[]) {
      const fromUrl = searchParams.get(key as string);
      out[key] = (fromUrl ?? defaultsRef.current[key]) as TFilters[keyof TFilters];
    }
    return out;
  }, [searchParams]);

  const page = useMemo(() => {
    const raw = Number(searchParams.get("page"));
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
  }, [searchParams]);

  const setFilters = useCallback(
    (patch: Partial<TFilters>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined) continue;
            // Omit defaults so `/users` and `/users?verification=all` are the
            // same URL — and therefore the same cache entry.
            if (value === defaultsRef.current[key as keyof TFilters] || value === "") {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          }
          // Any filter change invalidates the current page offset: page 4 of an
          // unfiltered list is usually out of range once a filter narrows it.
          next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setPage = useCallback(
    (nextPage: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextPage <= 1) next.delete("page");
          else next.set("page", String(nextPage));
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const isFiltered = useMemo(
    () =>
      (Object.keys(defaultsRef.current) as (keyof TFilters)[]).some(
        (k) => filters[k] !== defaultsRef.current[k],
      ),
    [filters],
  );

  return { filters, page, setFilters, setPage, isFiltered };
}

/**
 * Bind a text input to a committed (URL-backed) filter value.
 *
 * Typing updates the visible input on every keystroke but only commits — and
 * therefore only changes the query key and fires a request — after the user
 * pauses. The `lastCommitted` ref keeps the two directions from fighting:
 * without it, pushing a value up to the URL would immediately echo back down
 * and overwrite whatever had been typed in the meantime.
 *
 * Returns [visibleValue, setVisibleValue].
 */
export function useSearchField(
  committed: string,
  commit: (value: string) => void,
  delayMs = 300,
) {
  const [value, setValue] = useState(committed);
  const debounced = useDebouncedValue(value, delayMs);
  const lastCommitted = useRef(committed);

  // Typing → URL.
  useEffect(() => {
    if (debounced === lastCommitted.current) return;
    lastCommitted.current = debounced;
    commit(debounced);
  }, [debounced, commit]);

  // URL → input, for changes this field did not originate: Back/Forward
  // restoring a previous search, or a "clear filters" action.
  useEffect(() => {
    if (committed === lastCommitted.current) return;
    lastCommitted.current = committed;
    setValue(committed);
  }, [committed]);

  return [value, setValue] as const;
}
