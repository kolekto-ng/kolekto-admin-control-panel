import { supabase } from "@/integrations/supabase/client";
import { axiosInstance } from "@/lib/axios";

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION DETAIL
//
// A note on what is deliberately NOT trimmed here: the nested
// `contributions(...)` selection looks like the kind of unbounded fetch this
// work is removing, and the largest collection in production carries ~800 of
// them. It stays complete on purpose — the page derives the collection's
// **Total Raised** from the sum of paid contributions
// (`contributionsSum` in CollectionDetailPage), and it counts contributors per
// price tier from the same array. Capping the list with `.limit()` would not
// just shorten a table, it would silently under-report money. ~800 narrow rows
// is a bounded, per-collection cost, unlike the list-page queries that pulled
// the whole platform.
//
// The real win on this page is structural: the live-wallet call below used to
// be awaited *inside* this function, after the Supabase round trip, so the two
// ran nose-to-tail. They are now separate queries that run in parallel.
// ─────────────────────────────────────────────────────────────────────────────

export interface CollectionDetailResult {
  collection: any;
  organizer: any;
  wallet: any;
  contributors: any[];
  withdrawals: any[];
}

export async function fetchCollectionDetail(
  id: string,
): Promise<CollectionDetailResult> {
  const { data, error } = await supabase
    .from("collections")
    .select(`
      id,
      title,
      description,
      status,
      created_at,
      amount,
      total_contributions,
      type,
      collection_type,
      max_contributions,
      user_id,
      currency,
      currency_symbol,
      contributions_fields,
      price_tiers,
      deadline,
      support_phone_number,
      slug,
      rejection_reason,
      min_contribution,
      target_amount,
      event_date,
      ticket_mode,
      allow_multiple_quantity,
      is_open_ended,
      auto_close,
      campaign_category,
      campaign_summary,
      campaign_country,
      organizer:user_id(id, full_name, email, phone_number),
      wallets(net_payment, available_balance, pending_balance, ledger_balance, withdrawn, updated_at, created_at),
      contributions(id, name, amount, created_at, status),
      withdrawals(id, amount, status, created_at)
    `)
    .eq("id", id)
    .single();

  if (error) throw error;

  const collection = data as any;

  // Legacy data can carry duplicate wallet rows; the most recently updated one
  // is authoritative.
  const walletList = collection.wallets;
  let wallet: any = null;
  if (Array.isArray(walletList) && walletList.length > 0) {
    wallet = [...walletList].sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at || 0).getTime() -
        new Date(a.updated_at || a.created_at || 0).getTime(),
    )[0];
  } else if (walletList && !Array.isArray(walletList)) {
    wallet = walletList;
  }

  const byNewest = (a: any, b: any) =>
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();

  return {
    collection,
    organizer: collection.organizer || null,
    wallet,
    contributors: [...(collection.contributions || [])].sort(byNewest),
    withdrawals: [...(collection.withdrawals || [])].sort(byNewest),
  };
}

/**
 * Best-effort live wallet snapshot. Returns null when the backend is
 * unreachable so the page keeps using the cached `wallets` columns, exactly as
 * the previous inline try/catch did.
 */
export async function fetchCollectionWalletLive(id: string): Promise<any | null> {
  try {
    const { data } = await axiosInstance.get(
      `/adminurlabdkole/collections/${id}/wallet-live`,
    );
    if (data && (data.source === "live" || typeof data.availableBalance === "number")) {
      return data;
    }
    return null;
  } catch (err) {
    console.warn(
      "Live wallet fetch failed — falling back to cached wallet columns:",
      err,
    );
    return null;
  }
}
