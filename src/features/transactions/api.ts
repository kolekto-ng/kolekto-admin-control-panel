import { supabase } from "@/integrations/supabase/client";
import type { TransactionsListParams } from "@/lib/queryKeys";
import type { Transaction } from "@/stores/dashboardStore";
import type { Page } from "@/lib/pagination";

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATING A LIST THAT SPANS TWO TABLES
//
// The Transactions view is a date-ordered merge of `contributions` and
// `withdrawals`. The old page fetched **both tables in full** — 5,556
// contributions plus 280 withdrawals, unbounded — merged them in JavaScript,
// sorted 5,836 objects, then rendered `.slice(0, 10)`. Every mount. There is no
// SQL view unioning the two, so the naive fix ("just add .range()") would be
// wrong: page N of the merged list is not page N of either table.
//
// The correct bound comes from a property of merged sorted lists: any item in
// the global top K must also be within the top K of its own source list. So to
// render the page covering global ranks [offset, offset + pageSize), fetching
// the top `offset + pageSize` rows from each table is sufficient — merging
// those and slicing gives provably the same rows as merging the full tables.
//
// Cost at page 1 is 10 rows per table instead of 5,836, and it degrades
// linearly with page depth rather than being pinned at "entire dataset". A
// filter that excludes one type skips that table's request altogether.
// ─────────────────────────────────────────────────────────────────────────────

function mapContribution(row: any): Transaction {
  const title = row.collections?.title || "Unknown Collection";
  return {
    id: row.id,
    amount: row.amount,
    type: "contribution",
    description: `Contribution to ${title}`,
    date: row.created_at,
    status: row.status === "paid" ? "success" : "pending",
    user: row.name || "Anonymous",
    collection: title,
  };
}

function mapWithdrawal(row: any): Transaction {
  const title = row.collections?.title || "Unknown Collection";
  return {
    id: row.id,
    amount: row.amount,
    type: "withdrawal",
    description: `Withdrawal from ${title}`,
    date: row.created_at,
    status:
      row.status === "approved"
        ? "success"
        : row.status === "rejected"
          ? "failed"
          : "pending",
    user: "Organizer",
    collection: title,
  };
}

export async function fetchTransactionsPage(
  params: TransactionsListParams,
): Promise<Page<Transaction>> {
  const { page, pageSize, from, to, type, status } = params;
  const offset = (page - 1) * pageSize;
  // Ranks 0..(offset + pageSize - 1) are all that can appear on this page.
  const candidateCount = offset + pageSize;

  let wantContributions = type === "all" || type === "contribution";
  let wantWithdrawals = type === "all" || type === "withdrawal";

  // The UI's status vocabulary (success / pending / failed) is a projection of
  // two different column vocabularies. Translate it per table, and drop a table
  // entirely when the requested status cannot occur in it — a "failed" filter
  // has no contribution counterpart, so that request is not sent at all.
  if (status === "failed") wantContributions = false;

  const buildContributions = () => {
    let q = supabase
      .from("contributions")
      .select("id, amount, created_at, status, name, collections(title)", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(0, candidateCount - 1);
    if (from) q = q.gte("created_at", from);
    if (to) q = q.lte("created_at", to);
    if (status === "success") q = q.eq("status", "paid");
    else if (status === "pending") q = q.neq("status", "paid");
    return q;
  };

  const buildWithdrawals = () => {
    let q = supabase
      .from("withdrawals")
      .select("id, amount, created_at, status, user_id, collections(title)", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(0, candidateCount - 1);
    if (from) q = q.gte("created_at", from);
    if (to) q = q.lte("created_at", to);
    if (status === "success") q = q.eq("status", "approved");
    else if (status === "failed") q = q.eq("status", "rejected");
    else if (status === "pending") {
      q = q.not("status", "in", "(approved,rejected)");
    }
    return q;
  };

  const [contributionsRes, withdrawalsRes] = await Promise.all([
    wantContributions ? buildContributions() : Promise.resolve(null),
    wantWithdrawals ? buildWithdrawals() : Promise.resolve(null),
  ]);

  if (contributionsRes?.error) throw contributionsRes.error;
  if (withdrawalsRes?.error) throw withdrawalsRes.error;

  // Deep-paging safeguard. PostgREST can be configured with a server-side
  // `max-rows` cap that silently truncates a requested range. The merge above
  // is only provably correct while each source actually returned its full
  // candidate window, so detect a short read (fewer rows than asked for, while
  // the exact count says more exist) and say so rather than rendering a page
  // that is quietly missing rows.
  const truncated = [contributionsRes, withdrawalsRes].some(
    (res) =>
      res &&
      res.data &&
      res.data.length < candidateCount &&
      (res.count ?? 0) > res.data.length,
  );
  if (truncated) {
    console.warn(
      `[transactions] page ${page} exceeded the server row cap; results may be ` +
        "incomplete at this depth. Narrow the date range to page reliably.",
    );
  }

  const merged: Transaction[] = [
    ...(contributionsRes?.data ?? []).map(mapContribution),
    ...(withdrawalsRes?.data ?? []).map(mapWithdrawal),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // `count` is the exact total per table even though only the candidate window
  // was transferred, so the page count is accurate without downloading rows.
  const total =
    (contributionsRes?.count ?? 0) + (withdrawalsRes?.count ?? 0);

  return {
    rows: merged.slice(offset, offset + pageSize),
    total,
  };
}
