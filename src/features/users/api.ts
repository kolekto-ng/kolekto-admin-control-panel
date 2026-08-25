import { supabase } from "@/integrations/supabase/client";
import type { UsersListParams } from "@/lib/queryKeys";
import type { Page } from "@/lib/pagination";

export type VerificationStatus =
  | "verified"
  | "pending"
  | "rejected"
  | "unverified";

/** One row of the Users table. Deliberately flat and small. */
export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  collections: number;
  status: "active" | "inactive";
  verificationStatus: VerificationStatus;
  dateOfBirth: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS SELECT LOOKS THE WAY IT DOES
//
// The query it replaces was:
//
//     .from("profiles").select("*, collections(*, wallets(net_payment))")
//                      .order("created_at", { ascending: false })
//
// with no limit. Measured against production (609 profiles / 264 collections)
// that materialised **4.9 MB of JSON** — to render ten table rows. Three
// separate problems stacked up:
//
//   * `collections(*)` pulled every column of every collection the user owns,
//     including `story_images` (1.6 MB across the table on its own), `story`,
//     `price_tiers`, `banner_url` — solely so the code could read `.length`.
//     `collections(count)` asks Postgres for the number and transfers an
//     integer instead of the rows.
//   * `wallets(net_payment)` was fetched for every collection and then never
//     read: the mapper hard-coded `totalRaised: 0`. It is simply gone.
//   * `select("*")` on profiles shipped every profile column; the table renders
//     six of them.
//
// It also fixes a latent correctness bug. The old mapper branched on
// `profile.kyc_verifications` to derive the verification badge, but the SELECT
// never requested that relation — so the property was always `undefined` and
// **every user rendered as "Unverified"**, which also made the verification
// filter dead. `kyc_verifications` has a UNIQUE constraint on user_id, so
// PostgREST embeds it as a to-one object; it is now actually selected.
// ─────────────────────────────────────────────────────────────────────────────
const USER_LIST_SELECT = `
  id,
  full_name,
  email,
  phone_number,
  created_at,
  date_of_birth,
  kyc_verifications(status),
  collections(count)
`;

function toVerificationStatus(raw: unknown): VerificationStatus {
  const status =
    raw && typeof raw === "object" && "status" in raw
      ? String((raw as { status: unknown }).status ?? "")
      : "";

  if (status === "verified") return "verified";
  if (status === "pending" || status === "reviewing") return "pending";
  if (status === "rejected") return "rejected";
  return "unverified";
}

function toUserRow(profile: Record<string, unknown>): UserRow {
  // `collections(count)` comes back as [{ count: n }].
  const countRel = profile.collections as { count?: number }[] | null;
  const collectionsCount = Array.isArray(countRel) ? countRel[0]?.count ?? 0 : 0;

  return {
    id: String(profile.id),
    name: (profile.full_name as string) || "Unknown User",
    email: (profile.email as string) || "",
    phone: (profile.phone_number as string) || "",
    joinDate: (profile.created_at as string) || "",
    collections: collectionsCount,
    status: "active",
    verificationStatus: toVerificationStatus(profile.kyc_verifications),
    dateOfBirth: (profile.date_of_birth as string) ?? null,
  };
}

/** PostgREST `or=` treats , and ) structurally — neutralise them in user input. */
function sanitiseSearch(term: string): string {
  return term.replace(/[(),*\\]/g, " ").trim();
}

export async function fetchUsersPage(
  params: UsersListParams,
): Promise<Page<UserRow>> {
  const { page, pageSize, search, verification, sortBy, sortDir } = params;

  // Only "unverified" needs the LEFT-embed (it means "has no KYC row at all").
  // The three positive states need an INNER embed so profiles without a KYC row
  // are excluded rather than returned with a null relation.
  const needsInnerJoin =
    verification === "verified" ||
    verification === "pending" ||
    verification === "rejected";

  const select = needsInnerJoin
    ? USER_LIST_SELECT.replace(
        "kyc_verifications(status)",
        "kyc_verifications!inner(status)",
      )
    : USER_LIST_SELECT;

  let query = supabase
    .from("profiles")
    .select(select, { count: "exact" });

  const term = sanitiseSearch(search);
  if (term) {
    // Server-side search across the three columns the UI advertises. Previously
    // this filtered an in-memory array, which is only possible because the page
    // had already downloaded every user.
    query = query.or(
      `full_name.ilike.%${term}%,email.ilike.%${term}%,phone_number.ilike.%${term}%`,
    );
  }

  if (verification === "verified") {
    query = query.eq("kyc_verifications.status", "verified");
  } else if (verification === "rejected") {
    query = query.eq("kyc_verifications.status", "rejected");
  } else if (verification === "pending") {
    query = query.in("kyc_verifications.status", ["pending", "reviewing"]);
  } else if (verification === "unverified") {
    // No KYC record on file.
    query = query.is("kyc_verifications", null);
  }

  const from = (page - 1) * pageSize;
  query = query
    .order(sortBy, { ascending: sortDir === "asc" })
    // Stable tiebreaker: without it, rows sharing a created_at can swap between
    // pages and appear duplicated on one page and missing from another.
    .order("id", { ascending: true })
    .range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    rows: ((data ?? []) as unknown as Record<string, unknown>[]).map(toUserRow),
    total: count ?? 0,
  };
}
