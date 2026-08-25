import {
  keepPreviousData,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { qk, type CollectionsListParams } from "@/lib/queryKeys";
import type { Page } from "@/lib/pagination";
import {
  fetchCollectionTypeCounts,
  fetchCollectionsPage,
  type CollectionRow,
} from "./api";
import {
  fetchCollectionDetail,
  fetchCollectionWalletLive,
  type CollectionDetailResult,
} from "./detailApi";

export function useCollectionsList(params: CollectionsListParams) {
  return useQuery<Page<CollectionRow>>({
    queryKey: qk.collections.list(params),
    queryFn: () => fetchCollectionsPage(params),
    placeholderData: keepPreviousData,
  });
}

/**
 * Type breakdown chips. Its own cache entry with a longer staleTime — the
 * counts are a whole-table aggregate that does not need to re-run every time
 * the admin pages through the table.
 */
export function useCollectionTypeCounts() {
  return useQuery<Record<string, number>>({
    queryKey: [...qk.collections.all(), "type-counts"],
    queryFn: fetchCollectionTypeCounts,
    staleTime: 5 * 60_000,
  });
}

/** Master → detail handoff, mirroring `findCachedUserRow`. */
export function findCachedCollectionRow(
  client: QueryClient,
  id: string,
): CollectionRow | undefined {
  const entries = client.getQueriesData<Page<CollectionRow>>({
    queryKey: qk.collections.lists(),
  });
  for (const [, page] of entries) {
    const hit = page?.rows.find((row) => row.id === id);
    if (hit) return hit;
  }
  return undefined;
}

/**
 * Collection detail — the heavy record, seeded from the cached list row so the
 * header renders on the first frame after a row click.
 */
export function useCollectionDetail(id: string | undefined) {
  const client = useQueryClient();

  return useQuery({
    queryKey: qk.collections.detail(id ?? ""),
    queryFn: () => fetchCollectionDetail(id as string),
    enabled: Boolean(id),
    placeholderData: () => {
      if (!id) return undefined;
      const row = findCachedCollectionRow(client, id);
      if (!row) return undefined;
      // Only the fields the list genuinely carries. Everything financial is
      // left at its empty default so a partial record can never be mistaken
      // for a loaded one — this is a head start on rendering, not a substitute
      // for the fetch, which still runs immediately.
      return {
        collection: {
          id: row.id,
          title: row.title,
          status: row.status,
          created_at: row.createdAt,
          slug: row.slug,
          collection_type: row.collection_type,
          type: row.type,
          user_id: row.userId,
          total_contributions: row.contributors,
          target_amount: row.targetAmount,
          max_contributions: null,
          price_tiers: [],
        },
        organizer: null,
        wallet: null,
        contributors: [],
        withdrawals: [],
      } as CollectionDetailResult;
    },
  });
}

export function useCollectionWalletLive(id: string | undefined) {
  return useQuery({
    queryKey: [...qk.collections.detail(id ?? ""), "wallet-live"],
    queryFn: () => fetchCollectionWalletLive(id as string),
    enabled: Boolean(id),
    staleTime: 10_000,
  });
}
