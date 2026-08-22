import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  isCompletedWithdrawal,
  withdrawalStatusBucket,
  withdrawalStatusLabel,
  PENDING_WITHDRAWAL_STATUSES,
} from "@/lib/withdrawalStatus";

export interface DashboardStats {
  totalUsers: number;
  totalCollections: number;
  totalContributions: number;
  totalWithdrawals: number;
  approvedWithdrawals: number;
  pendingWithdrawals: number;
  flaggedTransactions: number;
  totalCampaigns: number;
  pendingFundraisers: number;
  activeCampaigns: number;
  pendingKyc: number;
  totalKycSubmissions: number;
  totalAvailableBalance: number;
  totalLedgerBalance: number;
  totalPendingBalance: number;
  // Collection type breakdown
  collectionsByType: Record<string, number>;

  // ── Historical reporting (admin platform-level only) ──────────────────
  // Business decision (2026-08-11): platform-level admin reporting treats
  // the 923 historical orphaned payments (deposits whose parent collection
  // was hard-deleted before the delete-guard existed — see
  // kolekto-be-old/database/historical_orphaned_payments_reporting_2026-08-11.sql)
  // as historically received AND historically distributed, for these two
  // totals ONLY. This is a reporting convention, not a ledger change: no
  // contribution/wallet/withdrawal row is created, and
  // totalAvailableBalance/totalPendingBalance above remain pure current-cash
  // figures, untouched by any of this. Never derive collection- or
  // tier-level numbers from these fields — the orphan pool has no surviving
  // collection_id and cannot be attributed to any collection or tier.
  historicalOrphanedCount: number;
  historicalOrphanedGross: number;
  /** verified paid contributions only — same figure as totalContributions */
  verifiedProcessed: number;
  /** verified paid contributions + historical orphaned gross */
  adminTotalProcessed: number;
  /** verified approved/successful withdrawals only — same figure as approvedWithdrawals */
  verifiedWithdrawn: number;
  /** verified withdrawals + historical orphaned gross (treated-as-distributed policy) */
  adminTotalWithdrawn: number;
}

export interface Transaction {
  id: string;
  amount: number;
  type: "contribution" | "withdrawal";
  description: string;
  date: string;
  status: "success" | "failed" | "flagged" | "pending";
  /**
   * Precise operator-facing label for `status` (wave 6.7F.8).
   *
   * `status` is a three-way colour bucket and cannot distinguish "Rejected by
   * Super Admin" from "Rejected by Workspace Owner", or a Super Admin queue
   * item from one still awaiting the workspace OWNER. The renderer prefers
   * this when present and falls back to capitalising `status`.
   */
  statusLabel?: string;
  user: string;
  collection: string;
}

interface DashboardState {
  stats: DashboardStats | null;
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  // Human-readable labels of individual metrics that failed to load on the
  // most recent fetch (Supabase permission/RLS/query errors resolve rather
  // than reject, so these are NOT visible via a try/catch — each sub-query's
  // own `.error` field has to be checked explicitly). Empty when everything
  // loaded cleanly. Non-empty does not mean the whole dashboard is broken —
  // it means these specific numbers may be stale or unavailable and should
  // not be read as confirmed zeros.
  partialErrors: string[];
  fetchDashboardData: () => Promise<void>;
}

// One labeled sub-query per dashboard metric. Previously these ran as bare
// Promise.allSettled entries and a `fulfilled` result was treated as
// unconditionally good — but a Supabase query RESOLVES (never rejects) even
// on a permission/RLS error, returning `{ data: null, error: {...} }`. That
// meant a blocked table silently rendered as "0" with no warning anywhere,
// which is exactly the failure mode that hid the RLS/GRANT bugs fixed
// earlier in the admin-panel remediation. Every entry here is now checked
// for BOTH promise rejection AND a populated `.error` field.
/**
 * Read EVERY row of a projection, page by page (wave 6.7F.8).
 *
 * ── THE BUG THIS FIXES ───────────────────────────────────────────────────────
 * The dashboard sums money client-side: paid contributions, withdrawal amounts
 * and wallet balances. Each was read with a single unpaginated
 * `.select("amount")`. PostgREST caps such a read at `db.max_rows` (1,000 by
 * default) and truncates SILENTLY — no error, no flag, just fewer rows. Past
 * that point every one of those totals under-reports, and the console shows a
 * confident, wrong number. On a financial admin surface that is the worst
 * possible failure shape: quiet and plausible.
 *
 * ── WHY NOT AN AGGREGATE RPC ─────────────────────────────────────────────────
 * `sum()` in SQL would be one round-trip instead of N. It was rejected for this
 * wave for two reasons:
 *   1. Kolekto's balance math is ALREADY implemented three times (Node in
 *      utils/financial.js, Deno in the edge functions, SQL in the atomic
 *      withdrawal RPCs) and that duplication is a known, documented source of
 *      drift. A fourth implementation — in a place nothing else validates —
 *      buys a round-trip and costs a reconciliation risk.
 *   2. It needs a migration. This wave is explicitly pre-migration.
 * Pagination keeps the EXACT same arithmetic on the EXACT same rows; only the
 * row set becomes complete. Nothing about the money model changes.
 *
 * ── HONESTY BOUND ────────────────────────────────────────────────────────────
 * Paging is bounded at MAX_ROWS. If a table ever exceeds it the result carries
 * `truncated: true` so the caller can SAY the figure is a floor rather than
 * presenting it as exact. Never silently truncate a financial total — that is
 * the very bug being fixed here.
 *
 * The correct long-term answer is a server-side aggregate on the backend, using
 * the existing Node financial engine rather than new SQL. Recorded in the wave
 * report as the follow-up.
 */
const PAGE_SIZE = 1000;
const MAX_ROWS = 100_000;

export interface PagedResult<T> {
  data: T[] | null;
  error: { message?: string } | null;
  truncated: boolean;
}

/**
 * The table names the generated schema actually knows about, so a literal typo
 * at a call site is a compile error rather than a runtime 404.
 *
 * Taken from `Database` directly, NOT from `Parameters<typeof supabase.from>`:
 * `from` is overloaded and its final overload takes `never`, so the
 * `Parameters<>` form resolves to `never` and rejects every real table name.
 */
type KnownTable = keyof Database["public"]["Tables"];

async function fetchAllRows<T = any>(
  table: KnownTable,
  columns: string,
  filter?: (q: any) => any,
): Promise<PagedResult<T>> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    let q: any = supabase.from(table).select(columns).range(from, from + PAGE_SIZE - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    // Surface the error in the same `{ data, error }` shape every other entry
    // in buildQueries() produces, so the existing per-query error handling
    // (which checks BOTH rejection and `.error`) keeps working unchanged.
    if (error) return { data: null, error, truncated: false };
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return { data: rows, error: null, truncated: false };
    if (rows.length >= MAX_ROWS) return { data: rows, error: null, truncated: true };
    from += PAGE_SIZE;
  }
}

function buildQueries() {
  return [
    { label: "Total users", query: supabase.from("profiles").select("*", { count: "exact", head: true }) },
    { label: "Total collections", query: supabase.from("collections").select("*", { count: "exact", head: true }) },
    // ⚠️ ROW-CAP (wave 6.7F.8). These two entries fetch ROWS and sum them in
    // the browser. PostgREST caps an unpaginated read at `db.max_rows` (1,000
    // by default) and does so SILENTLY — no error, just fewer rows — so above
    // that threshold both totals quietly under-report money with nothing on
    // screen to indicate it.
    //
    // The QUERIES here are unchanged, but they are now issued through
    // `fetchAllRows` (see below), which walks the full set with explicit
    // .range() pages instead of relying on a single capped read.
    //
    // TEST cannot demonstrate the truncation today — its largest table is 199
    // rows — which is exactly why this needed fixing on principle rather than
    // after an incident: the first time it bites is in production, silently.
    {
      label: "Contributions total",
      query: fetchAllRows("contributions", "amount", (q) => q.eq("status", "paid")),
    },
    { label: "Withdrawals total", query: fetchAllRows("withdrawals", "amount, status") },
    {
      // Wave 6.7F.8 — was `.eq("status","pending")`, which EXCLUDED
      // `pending_owner_approval`. Those withdrawals are equally un-actioned;
      // omitting them made the operator's "pending" KPI under-report the real
      // queue (4 such rows on TEST were invisible to this count). Both stages
      // are awaiting a human decision, so both belong in the figure.
      label: "Pending withdrawals",
      query: supabase
        .from("withdrawals")
        .select("*", { count: "exact", head: true })
        .in("status", PENDING_WITHDRAWAL_STATUSES),
    },
    { label: "Total campaigns", query: supabase.from("campaigns").select("*", { count: "exact", head: true }) },
    {
      label: "Pending fundraisers",
      query: supabase
        .from("campaigns")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending_verification", "pending"]),
    },
    {
      label: "Active campaigns",
      query: supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "active"),
    },
    { label: "Collection type breakdown", query: supabase.from("collections").select("collection_type, type") },
    {
      label: "Recent contributions",
      query: supabase
        .from("contributions")
        .select(`id, amount, created_at, status, name, collections!inner(title)`)
        .order("created_at", { ascending: false })
        .limit(10),
    },
    {
      label: "Recent withdrawals",
      query: supabase
        .from("withdrawals")
        .select(`id, amount, created_at, status, collections!withdrawals_collection_id_fkey(title)`)
        .order("created_at", { ascending: false })
        .limit(10),
    },
    // Same row-cap reasoning as the two totals above — this one is summed into
    // the platform "total balance" figures.
    { label: "Wallet balances", query: fetchAllRows("wallets", "available_balance, ledger_balance") },
    {
      label: "Pending KYC",
      query: supabase.from("kyc_verifications").select("*", { count: "exact", head: true }).eq("status", "pending"),
    },
    { label: "Total KYC submissions", query: supabase.from("kyc_verifications").select("*", { count: "exact", head: true }) },
    // Platform-wide only (see DashboardStats' historicalOrphaned* fields) —
    // admin-gated RPC, never joined to any collection/tier. A non-admin
    // session gets a FORBIDDEN error here, which this store treats like any
    // other failed sub-query (falls back to 0/previous value, logged in
    // partialErrors) rather than surfacing raw error text.
    { label: "Historical orphaned payments", query: supabase.rpc("get_historical_orphaned_payments_summary") },
  ] as const;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  stats: null,
  transactions: [],
  loading: false,
  error: null,
  partialErrors: [],

  fetchDashboardData: async () => {
    set({ loading: true, error: null });

    const queries = buildQueries();
    const settled = await Promise.allSettled(queries.map((q) => q.query));

    // If every single query failed at the transport level, this is a total
    // load failure — surface the blanket error state and keep whatever
    // stats/transactions were already on screen rather than blanking them.
    if (settled.every((r) => r.status === "rejected")) {
      console.error("[dashboardStore] all dashboard queries failed at the transport level");
      set({ error: "Failed to load dashboard data", loading: false });
      return;
    }

    const partialErrors: string[] = [];
    // Extract each result independently. A result only counts as usable when
    // the promise fulfilled AND its own `.error` field is empty — a Supabase
    // permission/RLS failure resolves with `{ data: null, error: {...} }`,
    // which is indistinguishable from "no rows" unless `.error` is checked.
    const at = (i: number): any => {
      const r = settled[i];
      const label = queries[i].label;
      if (r.status === "rejected") {
        console.warn(`[dashboardStore] "${label}" failed (rejected):`, (r.reason as any)?.message ?? r.reason);
        partialErrors.push(label);
        return null;
      }
      const value = r.value as { data?: unknown; count?: number | null; error?: { message?: string } | null };
      if (value?.error) {
        console.warn(`[dashboardStore] "${label}" failed (query error):`, value.error.message ?? value.error);
        partialErrors.push(label);
        return null;
      }
      return value ?? {};
    };

    // A failed metric keeps its previous value (if one was already loaded)
    // instead of silently becoming 0, so a transient failure can never make
    // a real balance/count look like it dropped to zero. Only a metric that
    // has NEVER successfully loaded falls back to 0 — and that fallback is
    // always accompanied by its label in partialErrors, so the UI can tell
    // the two cases apart instead of reading a bare 0 as ground truth.
    const previousStats = get().stats;

    const totalUsersRes = at(0);
    const totalCollectionsRes = at(1);
    const contributionsRes = at(2);
    const withdrawalsRes = at(3);
    const pendingWithdrawalsRes = at(4);
    const totalCampaignsRes = at(5);
    const pendingFundraisersRes = at(6);
    const activeCampaignsRes = at(7);
    const collectionTypeRes = at(8);
    const recentContributionsRes = at(9);
    const recentWithdrawalsRes = at(10);
    const walletsRes = at(11);
    const pendingKycRes = at(12);
    const totalKycSubmissionsRes = at(13);
    const historicalOrphanedRes = at(14);

    const totalUsers = totalUsersRes?.count ?? previousStats?.totalUsers ?? 0;
    const totalCollections = totalCollectionsRes?.count ?? previousStats?.totalCollections ?? 0;
    const pendingWithdrawals = pendingWithdrawalsRes?.count ?? previousStats?.pendingWithdrawals ?? 0;
    const totalCampaigns = totalCampaignsRes?.count ?? previousStats?.totalCampaigns ?? 0;
    const pendingFundraisers = pendingFundraisersRes?.count ?? previousStats?.pendingFundraisers ?? 0;
    const activeCampaigns = activeCampaignsRes?.count ?? previousStats?.activeCampaigns ?? 0;
    const pendingKyc = pendingKycRes?.count ?? previousStats?.pendingKyc ?? 0;
    const totalKycSubmissions = totalKycSubmissionsRes?.count ?? previousStats?.totalKycSubmissions ?? 0;

    // Sums derived from row data: a failed query has `data === null`, so the
    // reduce is skipped entirely (falls back to the previous total) rather
    // than reducing over an empty array, which would silently produce 0.
    const contributionsData = contributionsRes?.data as { amount: number }[] | null;
    const totalContributions =
      contributionsData?.reduce((sum, c) => sum + c.amount, 0) ?? previousStats?.totalContributions ?? 0;

    const withdrawalsData = withdrawalsRes?.data as { amount: number; status: string }[] | null;
    const totalWithdrawals =
      withdrawalsData?.reduce((sum, w) => sum + w.amount, 0) ?? previousStats?.totalWithdrawals ?? 0;
    // Wave 6.7F.8 — was `status === "approved" || status === "success"`, which
    // missed `completed` / `successful` / `processed`. The backend's financial
    // engine (utils/financial.js#computeWalletBalances) treats all of those as
    // paid out, so this figure could under-report money that had genuinely
    // left the wallet. isCompletedWithdrawal() is the same set.
    const approvedWithdrawals =
      withdrawalsData
        ?.filter((w) => isCompletedWithdrawal(w.status))
        ?.reduce((sum, w) => sum + w.amount, 0) ?? previousStats?.approvedWithdrawals ?? 0;

    const collectionTypeData = collectionTypeRes?.data as { collection_type?: string; type?: string }[] | null;
    const collectionsByType: Record<string, number> = collectionTypeData
      ? collectionTypeData.reduce<Record<string, number>>((acc, c) => {
          const ct = c.collection_type && c.collection_type !== "fixed" ? c.collection_type : c.type || "fixed";
          acc[ct] = (acc[ct] || 0) + 1;
          return acc;
        }, {})
      : previousStats?.collectionsByType ?? {};

    const walletsData = walletsRes?.data as { available_balance?: number; ledger_balance?: number }[] | null;
    const totalAvailableBalance =
      walletsData?.reduce((sum, w) => sum + (w.available_balance || 0), 0) ?? previousStats?.totalAvailableBalance ?? 0;
    const totalLedgerBalance =
      walletsData?.reduce((sum, w) => sum + (w.ledger_balance || 0), 0) ?? previousStats?.totalLedgerBalance ?? 0;
    const totalPendingBalance = walletsData
      ? Math.max(0, totalLedgerBalance - totalAvailableBalance)
      : previousStats?.totalPendingBalance ?? 0;

    // Historical orphaned payments — platform-level only (see DashboardStats
    // doc comment). RPC returns RETURNS TABLE as a one-row array; a failed/
    // forbidden call falls back to the previous value like every other
    // metric here, never to a silent 0 that would understate a real prior
    // reading.
    const historicalOrphanedRow = (historicalOrphanedRes?.data as
      | { orphan_count: number; orphan_gross: number | string }[]
      | null)?.[0];
    const historicalOrphanedCount =
      historicalOrphanedRow?.orphan_count ?? previousStats?.historicalOrphanedCount ?? 0;
    const historicalOrphanedGross = historicalOrphanedRow
      ? Number(historicalOrphanedRow.orphan_gross)
      : previousStats?.historicalOrphanedGross ?? 0;

    const verifiedProcessed = totalContributions;
    const verifiedWithdrawn = approvedWithdrawals;
    // Only well-defined once both terms are freshly loaded this pass — if
    // either sub-query failed, fall back to the previous combined total
    // rather than combining a fresh number with a stale one silently.
    const adminTotalProcessed =
      contributionsRes && historicalOrphanedRes
        ? verifiedProcessed + historicalOrphanedGross
        : previousStats?.adminTotalProcessed ?? verifiedProcessed;
    const adminTotalWithdrawn =
      withdrawalsRes && historicalOrphanedRes
        ? verifiedWithdrawn + historicalOrphanedGross
        : previousStats?.adminTotalWithdrawn ?? verifiedWithdrawn;

    const stats: DashboardStats = {
      totalUsers,
      totalCollections,
      totalContributions,
      totalWithdrawals,
      approvedWithdrawals,
      pendingWithdrawals,
      flaggedTransactions: 0,
      totalCampaigns,
      pendingFundraisers,
      activeCampaigns,
      pendingKyc,
      totalKycSubmissions,
      totalAvailableBalance,
      totalLedgerBalance,
      totalPendingBalance,
      collectionsByType,
      historicalOrphanedCount,
      historicalOrphanedGross,
      verifiedProcessed,
      adminTotalProcessed,
      verifiedWithdrawn,
      adminTotalWithdrawn,
    };

    // Recent-transactions widget: keep the previous list on a failed fetch
    // instead of replacing it with an empty one.
    const recentContributions = recentContributionsRes?.data as any[] | null;
    const recentWithdrawals = recentWithdrawalsRes?.data as any[] | null;
    const transactions: Transaction[] =
      recentContributionsRes === null && recentWithdrawalsRes === null
        ? get().transactions
        : [
            ...((recentContributions ?? [])).map((contribution: any) => ({
              id: contribution.id,
              amount: contribution.amount,
              type: "contribution" as const,
              description: `Contribution to ${contribution.collections?.title || "Unknown Collection"}`,
              date: contribution.created_at,
              status: contribution.status === "paid" ? ("success" as const) : ("pending" as const),
              user: contribution.name || "Anonymous",
              collection: contribution.collections?.title || "Unknown Collection",
            })),
            ...((recentWithdrawals ?? [])).map((withdrawal: any) => ({
              id: withdrawal.id,
              amount: withdrawal.amount,
              type: "withdrawal" as const,
              description: `Withdrawal from ${withdrawal.collections?.title || "Unknown Collection"}`,
              date: withdrawal.created_at,
              // Wave 6.7F.8 — was an inline
              //   approved|success -> success, rejected -> failed, else pending
              // ternary. That `else` rendered `owner_rejected` (TERMINAL — the
              // workspace OWNER declined it) as **Pending** on the admin
              // dashboard, and it missed the legacy completed/successful/
              // processed payout statuses. See lib/withdrawalStatus.ts.
              status: withdrawalStatusBucket(withdrawal.status),
              statusLabel: withdrawalStatusLabel(withdrawal.status),
              user: "Organizer",
              collection: withdrawal.collections?.title || "Unknown Collection",
            })),
          ]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10);

    set({ stats, transactions, loading: false, partialErrors });
  },
}));
