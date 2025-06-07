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
      // Fetch stats in parallel
      const [
        { count: totalUsers },
        { count: totalCollections },
        { data: contributionsData },
        { data: withdrawalsData },
        { count: pendingWithdrawals },
        { data: recentContributions },
        { data: recentWithdrawals },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase
          .from("collections")
          .select("*", { count: "exact", head: true })
          .is("deleted_at", null),
        supabase.from("contributions").select("amount").eq("status", "paid"),
        supabase.from("withdrawals").select("amount, status"),
        supabase
          .from("withdrawals")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("contributions")
          .select(
            `
          id, amount, created_at, status, name,
          collections!inner(title)
        `
          )
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("withdrawals")
          .select(
            `
          id, amount, created_at, status,
          profiles!withdrawals_organizer_id_fkey(full_name),
          collections!withdrawals_collection_id_fkey(title)
        `
          )
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      // Calculate totals
      const totalContributions =
        contributionsData?.reduce((sum, contrib) => sum + contrib.amount, 0) ||
        0;
      const totalWithdrawals =
        withdrawalsData?.reduce(
          (sum, withdrawal) => sum + withdrawal.amount,
          0
        ) || 0;
      const approvedWithdrawals =
        withdrawalsData
          ?.filter((w) => w.status === "approved")
          ?.reduce((sum, withdrawal) => sum + withdrawal.amount, 0) || 0;

      const stats: DashboardStats = {
        totalUsers: totalUsers || 0,
        totalCollections: totalCollections || 0,
        totalContributions,
        totalWithdrawals,
        approvedWithdrawals,
        pendingWithdrawals: pendingWithdrawals || 0,
        flaggedTransactions: 0, // This would need additional logic to determine flagged transactions
      };

      // Create transactions array from contributions and withdrawals
      const transactions: Transaction[] = [
        ...(recentContributions?.map((contribution: any) => ({
          id: contribution.id,
          amount: contribution.amount,
          type: "contribution" as const,
          description: `Contribution to ${
            contribution.collections?.title || "Unknown Collection"
          }`,
          date: contribution.created_at,
          status:
            contribution.status === "paid"
              ? ("success" as const)
              : ("pending" as const),
          user: contribution.name || "Anonymous",
          collection: contribution.collections?.title || "Unknown Collection",
        })) || []),
        ...(recentWithdrawals?.map((withdrawal: any) => ({
          id: withdrawal.id,
          amount: withdrawal.amount,
          type: "withdrawal" as const,
          description: `Withdrawal from ${
            withdrawal.collections?.title || "Unknown Collection"
          }`,
          date: withdrawal.created_at,
          status:
            withdrawal.status === "approved"
              ? ("success" as const)
              : withdrawal.status === "rejected"
              ? ("failed" as const)
              : ("pending" as const),
          user: withdrawal.profiles?.full_name || "Unknown User",
          collection: withdrawal.collections?.title || "Unknown Collection",
        })) || []),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      set({
        stats,
        transactions,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      set({
        error: "Failed to load dashboard data",
        loading: false,
      });
    }
  },
}));
