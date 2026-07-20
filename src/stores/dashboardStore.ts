import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

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
}

export interface Transaction {
  id: string;
  amount: number;
  type: "contribution" | "withdrawal";
  description: string;
  date: string;
  status: "success" | "failed" | "flagged" | "pending";
  user: string;
  collection: string;
}

interface DashboardState {
  stats: DashboardStats | null;
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  fetchDashboardData: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: null,
  transactions: [],
  loading: false,
  error: null,

  fetchDashboardData: async () => {
    set({ loading: true, error: null });

    try {
      // Promise.allSettled (not Promise.all): a single flaky sub-query — a
      // transient network blip or one bad relationship embed — used to reject
      // the whole batch and blank the entire dashboard with "Failed to load".
      // Now each metric degrades independently; the page still renders what it
      // could fetch. Only a TOTAL failure surfaces the error state.
      const settled = await Promise.allSettled([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("collections").select("*", { count: "exact", head: true }),
        supabase.from("contributions").select("amount").eq("status", "paid"),
        supabase.from("withdrawals").select("amount, status"),
        supabase
          .from("withdrawals")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase.from("campaigns").select("*", { count: "exact", head: true }),
        supabase
          .from("campaigns")
          .select("*", { count: "exact", head: true })
          .in("status", ["pending_verification", "pending"]),
        supabase
          .from("campaigns")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("collections")
          .select("collection_type, type"),
        supabase
          .from("contributions")
          .select(`id, amount, created_at, status, name, collections!inner(title)`)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("withdrawals")
          .select(`id, amount, created_at, status, collections!withdrawals_collection_id_fkey(title)`)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase.from("wallets").select("available_balance, ledger_balance"),
        supabase
          .from("kyc_verifications")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("kyc_verifications")
          .select("*", { count: "exact", head: true }),
      ]);

      // If every single query failed, this is a real load failure — surface it.
      if (settled.every((r) => r.status === "rejected")) {
        console.error("Error fetching dashboard data: all queries failed");
        set({ error: "Failed to load dashboard data", loading: false });
        return;
      }
      // Extract each result independently; a rejected one degrades to empty.
      const at = (i: number): any => {
        const r = settled[i];
        if (r.status === "fulfilled") return r.value ?? {};
        console.warn(`[dashboardStore] sub-query ${i} failed:`, (r.reason as any)?.message ?? r.reason);
        return {};
      };
      const totalUsers = at(0).count;
      const totalCollections = at(1).count;
      const contributionsData = at(2).data;
      const withdrawalsData = at(3).data;
      const pendingWithdrawals = at(4).count;
      const totalCampaigns = at(5).count;
      const pendingFundraisers = at(6).count;
      const activeCampaigns = at(7).count;
      const collectionTypeData = at(8).data;
      const recentContributions = at(9).data;
      const recentWithdrawals = at(10).data;
      const walletsData = at(11).data;
      const pendingKyc = at(12).count;
      const totalKycSubmissions = at(13).count;

      // Calculate totals
      const totalContributions =
        contributionsData?.reduce((sum, contrib) => sum + contrib.amount, 0) || 0;
      const totalWithdrawals =
        withdrawalsData?.reduce((sum, w) => sum + w.amount, 0) || 0;
      const approvedWithdrawals =
        withdrawalsData
          ?.filter((w) => w.status === "approved" || w.status === "success")
          ?.reduce((sum, w) => sum + w.amount, 0) || 0;

      // Build collection type breakdown
      const collectionsByType: Record<string, number> = {};
      (collectionTypeData || []).forEach((c: any) => {
        const ct = (c.collection_type && c.collection_type !== 'fixed')
          ? c.collection_type
          : (c.type || "fixed");
        collectionsByType[ct] = (collectionsByType[ct] || 0) + 1;
      });

      const totalAvailableBalance = walletsData?.reduce((sum, w) => sum + (w.available_balance || 0), 0) || 0;
      const totalLedgerBalance = walletsData?.reduce((sum, w) => sum + (w.ledger_balance || 0), 0) || 0;
      const totalPendingBalance = Math.max(0, totalLedgerBalance - totalAvailableBalance);

      const stats: DashboardStats = {
        totalUsers: totalUsers || 0,
        totalCollections: totalCollections || 0,
        totalContributions,
        totalWithdrawals,
        approvedWithdrawals,
        pendingWithdrawals: pendingWithdrawals || 0,
        flaggedTransactions: 0,
        totalCampaigns: totalCampaigns || 0,
        pendingFundraisers: pendingFundraisers || 0,
        activeCampaigns: activeCampaigns || 0,
        pendingKyc: pendingKyc || 0,
        totalKycSubmissions: totalKycSubmissions || 0,
        totalAvailableBalance,
        totalLedgerBalance,
        totalPendingBalance,
        collectionsByType,
      };

      // Build recent transactions list
      const transactions: Transaction[] = [
        ...(recentContributions?.map((contribution: any) => ({
          id: contribution.id,
          amount: contribution.amount,
          type: "contribution" as const,
          description: `Contribution to ${contribution.collections?.title || "Unknown Collection"}`,
          date: contribution.created_at,
          status: contribution.status === "paid" ? ("success" as const) : ("pending" as const),
          user: contribution.name || "Anonymous",
          collection: contribution.collections?.title || "Unknown Collection",
        })) || []),
        ...(recentWithdrawals?.map((withdrawal: any) => ({
          id: withdrawal.id,
          amount: withdrawal.amount,
          type: "withdrawal" as const,
          description: `Withdrawal from ${withdrawal.collections?.title || "Unknown Collection"}`,
          date: withdrawal.created_at,
          status:
            withdrawal.status === "approved" || withdrawal.status === "success"
              ? ("success" as const)
              : withdrawal.status === "rejected"
              ? ("failed" as const)
              : ("pending" as const),
          user: "Organizer",
          collection: withdrawal.collections?.title || "Unknown Collection",
        })) || []),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      set({ stats, transactions, loading: false });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      set({ error: "Failed to load dashboard data", loading: false });
    }
  },
}));
