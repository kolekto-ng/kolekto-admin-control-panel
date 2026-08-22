// Canonical withdrawal-status helpers for the admin console.
//
// WHY THIS EXISTS (performance/correctness wave 6.7F.8, 2026-08-20):
//
// The admin console had NO central status model. `WithdrawalsPage` and
// `WithdrawalDetailPage` each spell out the full, correct set of labels
// inline, but the two COARSE surfaces — `stores/dashboardStore.ts` and
// `pages/TransactionsPage.tsx` — collapsed everything with:
//
//     status === "approved" ? "success"
//   : status === "rejected" ? "failed"
//   : "pending"
//
// That `else` is the bug. It swept up BOTH of the two-stage workspace
// approval statuses:
//
//   • `owner_rejected`          — TERMINAL. The workspace OWNER declined an
//     ADMIN-initiated withdrawal. It will never pay out. It was rendered as
//     **"Pending"** on the admin dashboard and the transactions list. On TEST
//     there are 4 such rows today, each currently displayed as pending.
//     Showing a dead withdrawal as in-progress on a financial console is
//     exactly the kind of thing an operator acts on incorrectly.
//   • `pending_owner_approval`  — awaiting the workspace OWNER, not Kolekto
//     Super Admin. Bucketing it as "pending" is defensible; labelling it
//     identically to a withdrawal sitting in the Super Admin queue is not,
//     because it tells an admin to act on something that is not theirs to act
//     on yet. 4 such rows on TEST.
//
// It also missed the legacy payout statuses (`success`, `successful`,
// `completed`, `processed`) that the backend's own financial engine treats as
// paid out, so a legacy row could read as "pending" forever.
//
// THIS FILE IS A MIRROR, NOT A NEW MODEL. It intentionally reproduces
// `kolekto-fe-old/src/utils/withdrawalStatus.ts` — same three buckets, same
// membership, same precedence. The two apps are separate builds with no shared
// package, so a copy is the only option available without introducing a
// workspace/monorepo change that this wave has no business making. Keep them
// in sync, along with:
//   - kolekto-be-old/utils/financial.js#computeWalletBalances
//   - kolekto-be-old/controllers/dashboard.js#withdrawalStatusToActivityType
//
// The admin LABELS deliberately differ from the organizer-facing ones: an
// operator needs to know WHICH approval stage a row is at, so this file says
// "Awaiting Workspace Owner Approval" where the organizer app says "Awaiting
// Owner Approval". Those strings match what `WithdrawalsPage` already renders.

export type WithdrawalStatusBucket = "success" | "pending" | "failed";

/** Paid out — money has left the wallet. Mirrors the backend's COMPLETED set. */
const COMPLETED = new Set([
  "approved",
  "completed",
  "successful",
  "success",
  "processed",
]);

/** Still awaiting a human decision, at EITHER approval stage. */
const PENDING = new Set(["pending", "processing", "pending_owner_approval"]);

/** Will not pay out. `owner_rejected` belongs here, NOT in pending. */
const REJECTED = new Set([
  "rejected",
  "declined",
  "failed",
  "reversed",
  "owner_rejected",
]);

function normalise(status: string | null | undefined): string {
  return String(status || "").toLowerCase();
}

/**
 * Coarse bucket used for colour/aggregation on the dashboard and transactions
 * list. Anything unrecognised falls to "pending" — deliberately, because that
 * is the only bucket that asserts nothing final about the money. Never claim a
 * withdrawal succeeded or failed on the strength of a status we do not know.
 */
export function withdrawalStatusBucket(
  status: string | null | undefined,
): WithdrawalStatusBucket {
  const s = normalise(status);
  if (COMPLETED.has(s)) return "success";
  if (REJECTED.has(s)) return "failed";
  if (PENDING.has(s)) return "pending";
  return "pending";
}

/**
 * Operator-facing label. The two workspace-stage statuses get explicit names
 * so they can never read as a generic Super Admin queue item.
 */
export function withdrawalStatusLabel(status: string | null | undefined): string {
  const s = normalise(status);
  if (s === "pending_owner_approval") return "Awaiting Workspace Owner Approval";
  if (s === "owner_rejected") return "Rejected by Workspace Owner";
  if (s === "pending") return "Awaiting Super Admin Approval";
  if (s === "rejected") return "Rejected by Super Admin";
  if (COMPLETED.has(s)) return "Approved";
  if (s === "processing") return "Processing";
  if (REJECTED.has(s)) return "Rejected";
  return status ? String(status) : "Unknown";
}

/**
 * True once the withdrawal has actually paid out. This is the predicate the
 * dashboard's "approved withdrawals" total must use — the previous inline
 * `status === "approved" || status === "success"` missed `completed`,
 * `successful` and `processed`, under-reporting money that had genuinely left.
 */
export function isCompletedWithdrawal(status: string | null | undefined): boolean {
  return COMPLETED.has(normalise(status));
}

/** True while the withdrawal is still awaiting a decision at either stage. */
export function isPendingWithdrawal(status: string | null | undefined): boolean {
  return PENDING.has(normalise(status));
}

/** Every status that means "someone still has to act on this". */
export const PENDING_WITHDRAWAL_STATUSES: string[] = [...PENDING];
