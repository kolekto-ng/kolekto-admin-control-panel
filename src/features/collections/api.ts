import { supabase } from "@/integrations/supabase/client";
import type { CollectionsListParams } from "@/lib/queryKeys";
import type { Page } from "@/lib/pagination";

/** One row of the Collections table. */
export interface CollectionRow {
  id: string;
  title: string;
  organizer: string;
  userId: string;
  collection_type: string;
  type: string;
  targetAmount: number;
  raisedAmount: number;
  totalWithdrawn: number;
  availableBalance: number;
  pendingBalance: number;
  totalBalance: number;
  contributors: number;
  status: string;
  createdAt: string;
  slug: string | null;
}

// Same columns the old store asked for, minus the ones it mapped from fields it
// never actually selected (`description`, `deadline`, `story`, `price_tiers`,
// `story_images`, …). Those mappings silently produced defaults because the
// SELECT did not include them; the detail page is what loads the full record.
const COLLECTION_LIST_SELECT = `
  id,
  title,
  slug,
  collection_type,
  type,
  user_id,
  target_amount,
  amount,
  total_contributions,
  status,
  created_at,
  organizer:user_id(full_name, email),
  wallets(net_payment, withdrawn, available_balance, pending_balance, ledger_balance)
`;

/** `collection_type` defaults to 'fixed' in the DB, so a more specific `type` wins. */
export function canonicalType(row: {
  collection_type?: string | null;
  type?: string | null;
}): string {
  return row.collection_type && row.collection_type !== "fixed"
    ? row.collection_type
    : row.type || "fixed";
}

function toCollectionRow(raw: any): CollectionRow {
  const wallet = Array.isArray(raw.wallets)
    ? raw.wallets[0] ?? null
    : raw.wallets ?? null;
  const profile = raw.organizer;

  return {
    id: raw.id,
    title: raw.title,
    organizer: profile
      ? profile.full_name || profile.email || "Unknown User"
      : "Unknown Organizer",
    userId: raw.user_id,
    collection_type: canonicalType(raw),
    type: raw.type || "flat",
    targetAmount: Number(raw.target_amount || raw.amount || 0),
    // Total raised is lifetime received net of fees (net_payment), not
    // ledger_balance — the latter drops as withdrawals settle.
    raisedAmount: Number(wallet?.net_payment || 0),
    totalWithdrawn: Number(wallet?.withdrawn || 0),
    availableBalance: Number(wallet?.available_balance || 0),
    pendingBalance: Number(wallet?.pending_balance || 0),
    totalBalance: Number(wallet?.ledger_balance || 0),
    contributors: Number(raw.total_contributions) || 0,
    status: raw.status,
    createdAt: raw.created_at,
    slug: raw.slug ?? null,
  };
}

const ORGANIZER_MATCH_LIMIT = 100;

function sanitiseSearch(term: string): string {
  return term.replace(/[(),*\\]/g, " ").trim();
}

export async function fetchCollectionsPage(
  params: CollectionsListParams,
): Promise<Page<CollectionRow>> {
  const { page, pageSize, search, status, type, sortBy, sortDir } = params;

  let query = supabase
    .from("collections")
    .select(COLLECTION_LIST_SELECT, { count: "exact" });

  const term = sanitiseSearch(search);
  if (term) {
    // The old page searched title, slug AND organizer name. Organizer lives on
    // the joined profile, and PostgREST cannot OR a column of an embedded table
    // together with columns of the parent in a single filter. Rather than
    // silently dropping organizer matching, resolve matching organizers first
    // and fold their ids into the OR.
    //
    // The lookup is capped: a term matching more than ORGANIZER_MATCH_LIMIT
    // organizers contributes only that many. That is a deliberate bound on a
    // search box, and it replaces a strategy whose "no cap" was only possible
    // because the entire table had already been downloaded to the browser.
    const orParts = [`title.ilike.%${term}%`, `slug.ilike.%${term}%`];

    const { data: organizers } = await supabase
      .from("profiles")
      .select("id")
      .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
      .limit(ORGANIZER_MATCH_LIMIT);

    const organizerIds = (organizers ?? []).map((row: any) => row.id);
    if (organizerIds.length > 0) {
      orParts.push(`user_id.in.(${organizerIds.join(",")})`);
    }

    query = query.or(orParts.join(","));
  }

  if (status !== "all") query = query.eq("status", status);

  if (type !== "all") {
    // Canonical type is a two-column rule (`collection_type` unless it is the
    // default 'fixed', else `type`), so it cannot be a single eq() filter.
    if (type === "fixed") {
      query = query.or(
        "collection_type.eq.fixed,collection_type.is.null,type.eq.fixed,type.eq.flat",
      );
    } else {
      query = query.or(`collection_type.eq.${type},type.eq.${type}`);
    }
  }

  const from = (page - 1) * pageSize;
  query = query
    .order(sortBy, { ascending: sortDir === "asc" })
    .order("id", { ascending: true })
    .range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    rows: (data ?? []).map(toCollectionRow),
    total: count ?? 0,
  };
}

/** Status counts for the summary chips — aggregated server-side, not by counting a downloaded array. */
export async function fetchCollectionTypeCounts(): Promise<
  Record<string, number>
> {
  const { data, error } = await supabase
    .from("collections")
    .select("collection_type, type");
  if (error) throw error;

  return (data ?? []).reduce<Record<string, number>>((acc, row: any) => {
    const t = canonicalType(row);
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
}
