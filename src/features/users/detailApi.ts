import { supabase } from "@/integrations/supabase/client";
import { axiosInstance } from "@/lib/axios";

export interface UserDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  verificationStatus: string;
  collections: any[];
  withdrawals: any[];
  /** Sums of the cached wallet columns — the fallback when /wallet-live is down. */
  cachedTotals: {
    availableBalance: number;
    accountBalance: number;
    pendingBalance: number;
    totalRaised: number;
    totalWithdrawn: number;
    pendingWithdrawal: number;
  };
}

export interface LiveWalletStats {
  availableBalance: number;
  accountBalance: number;
  pendingBalance: number;
  totalRaised: number;
  totalWithdrawn: number;
  pendingWithdrawal: number;
}

/**
 * Profile + the per-collection wallet/withdrawal rows the detail page needs.
 *
 * This is the "detail" half of a master/detail split: the Users *list* already
 * supplies name, email, phone, join date and verification status, so the detail
 * screen paints those from cache immediately (see `useUserDetail`) and this
 * request only has to deliver what the list genuinely does not carry.
 */
export async function fetchUserDetail(id: string): Promise<UserDetail> {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      email,
      phone_number,
      created_at,
      kyc_verifications(status),
      collections(
        id,
        title,
        status,
        created_at,
        wallets(
          net_payment,
          available_balance,
          pending_balance,
          ledger_balance,
          updated_at,
          created_at
        ),
        withdrawals(id, amount, status, created_at)
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;

  const profile = data as any;
  const collections: any[] = profile.collections ?? [];

  let availableBalance = 0;
  let ledgerBalance = 0;
  let pendingBalance = 0;
  let netPayment = 0;
  let pendingWithdrawal = 0;
  let totalWithdrawn = 0;
  const withdrawals: any[] = [];

  for (const collection of collections) {
    const walletList = collection.wallets;
    let wallet: any = null;
    if (Array.isArray(walletList)) {
      if (walletList.length > 0) {
        wallet = [...walletList].sort(
          (a, b) =>
            new Date(b.updated_at || b.created_at || 0).getTime() -
            new Date(a.updated_at || a.created_at || 0).getTime(),
        )[0];
      }
    } else if (walletList) {
      wallet = walletList;
    }

    if (wallet) {
      availableBalance += Number(wallet.available_balance || 0);
      ledgerBalance += Number(wallet.ledger_balance || 0);
      pendingBalance += Number(wallet.pending_balance || 0);
      netPayment += Number(wallet.net_payment || 0);
    }

    if (Array.isArray(collection.withdrawals)) {
      for (const w of collection.withdrawals) {
        withdrawals.push({ ...w, collection_id: collection.id });
        if (w.status === "pending") {
          pendingWithdrawal += Number(w.amount || 0);
        } else if (["approved", "success", "paid"].includes(w.status)) {
          totalWithdrawn += Number(w.amount || 0);
        }
      }
    }
  }

  withdrawals.sort(
    (a, b) =>
      new Date(b.created_at || 0).getTime() -
      new Date(a.created_at || 0).getTime(),
  );

  const kyc = profile.kyc_verifications;
  const verificationStatus =
    (Array.isArray(kyc) ? kyc[0]?.status : kyc?.status) || "unverified";

  return {
    id: profile.id,
    name: profile.full_name || "Unknown User",
    email: profile.email || "",
    phone: profile.phone_number || "",
    joinDate: profile.created_at || "",
    verificationStatus,
    collections,
    withdrawals,
    cachedTotals: {
      availableBalance,
      accountBalance: ledgerBalance,
      pendingBalance,
      totalRaised: netPayment,
      totalWithdrawn,
      pendingWithdrawal,
    },
  };
}

/**
 * Server-recomputed wallet snapshot.
 *
 * Previously this was awaited *after* the Supabase profile query inside the
 * same function — a two-step waterfall where the page could not paint until
 * both had returned in sequence. It is now its own query so the two run in
 * parallel and the slower one no longer gates the faster one.
 *
 * Returns null (rather than throwing) when the backend is unreachable, so the
 * page falls back to the cached wallet columns exactly as it did before.
 */
export async function fetchUserWalletLive(
  id: string,
): Promise<LiveWalletStats | null> {
  try {
    const { data } = await axiosInstance.get(
      `/adminurlabdkole/users/${id}/wallet-live`,
    );
    if (!data || typeof data.totalBalance !== "number") return null;
    return {
      availableBalance: Number(data.availableBalance || 0),
      accountBalance: Number(data.totalBalance || 0),
      pendingBalance: Number(data.pendingBalance || 0),
      totalRaised: Number(data.totalRaised || 0),
      totalWithdrawn: Number(data.withdrawn || 0),
      pendingWithdrawal: Number(data.pendingWithdrawalRequests || 0),
    };
  } catch (err) {
    console.warn(
      "Live account wallet fetch failed — falling back to cached wallet columns:",
      err,
    );
    return null;
  }
}
