import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { axiosInstance } from "../lib/axios";
import { log } from "console";

export interface Withdrawal {
  id: string;
  collectionId: string;
  collectionName?: string;
  hostId: string;
  hostName: string;
  hostEmail: string;
  requestedAmount: number;
  dateRequested: string;
  status: "pending" | "approved" | "rejected";
  bankName: string;
  accountNumber: string;
  accountName: string;
}

interface WithdrawalsState {
  withdrawals: Withdrawal[];
  selectedWithdrawal: Withdrawal | null;
  loading: boolean;
  detailLoading: boolean;
  error: string | null;
  fetchWithdrawals: () => Promise<void>;
  getWithdrawalById: (id: string) => Withdrawal | undefined;
  fetchWithdrawalById: (id: string) => Promise<void>;
  approveWithdrawal: (id: string) => Promise<void>;
  rejectWithdrawal: (id: string) => Promise<void>;
}

export const useWithdrawalsStore = create<WithdrawalsState>((set, get) => ({
  withdrawals: [],
  selectedWithdrawal: null,
  loading: false,
  detailLoading: false,
  error: null,

  fetchWithdrawals: async () => {
    set({ loading: true, error: null });

    try {
      const { data: withdrawalsData, error } = await supabase
        .from("withdrawals")
        .select(
          `
          id,
          collection_id,
          user_id,
          amount,
          created_at,
          status,
          collections (
            title,
            profiles (
              full_name,
              email
            )
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const items = withdrawalsData || [];

      const formattedWithdrawals: Withdrawal[] = items.map((w: any) => {
        const profile = w.collections?.profiles;
        return {
          id: w.id,
          collectionId: w.collection_id,
          collectionName: w.collections?.title || "Unknown Collection",
          hostId: w.user_id,
          hostName: profile?.full_name || "Unknown Host",
          hostEmail: profile?.email || "unknown@example.com",
          requestedAmount: w.amount,
          dateRequested: w.created_at,
          status: w.status,
          bankName: "",
          accountNumber: "",
          accountName: "",
        };
      });

      set({
        withdrawals: formattedWithdrawals,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      set({
        error: "Failed to load withdrawals",
        loading: false,
      });
    }
  },

  fetchWithdrawalById: async (id: string) => {
    set({ detailLoading: true, error: null });
    try {
      const { data: w, error } = await supabase
        .from("withdrawals")
        .select(`
          *,
          collections (
            title,
            profiles (
              full_name,
              email
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!w) throw new Error("Withdrawal request not found");

      const profile = w.collections?.profiles;

      const formatted: Withdrawal = {
        id: w.id,
        collectionId: w.collection_id,
        collectionName: w.collections?.title || "Unknown Collection",
        hostId: w.user_id,
        hostName: profile?.full_name || "Unknown Host",
        hostEmail: profile?.email || "unknown@example.com",
        requestedAmount: w.amount,
        dateRequested: w.created_at,
        status: w.status,
        bankName:
          w.destination_account?.bank_name ||
          w.destination_account?.bank_code ||
          "Unknown Bank",
        accountNumber: w.destination_account?.accountNumber || "",
        accountName: w.destination_account?.accountName || "",
      };

      set({ selectedWithdrawal: formatted, detailLoading: false });
    } catch (err: any) {
      console.error("Error fetching withdrawal detail:", err);
      set({ error: "Failed to load withdrawal details", detailLoading: false });
    }
  },

  getWithdrawalById: (id: string) => {
    return get().withdrawals.find((withdrawal) => withdrawal.id === id);
  },

  // Approve path: must hit the backend. The backend:
  //   1. enforces requireAdmin (ADMIN_EMAILS allowlist) — auth check.
  //   2. updates withdrawals.status = "approved".
  //   3. calls refreshWallet → recomputes host's wallet from source of truth.
  //   4. sends host + admin emails.
  //
  // SECURITY (previous bug): there used to be a "fall back to direct Supabase
  // update" branch here that fired on 403. That branch silently bypassed the
  // backend's admin-only check — any user logged into the admin panel could
  // approve withdrawals even if their email wasn't in ADMIN_EMAILS. We have
  // removed the fallback. If the backend rejects the call, the failure is
  // surfaced to the admin user instead of being swallowed.
  approveWithdrawal: async (id: string) => {
    try {
      await axiosInstance.post("/withdrawals/approve", { id });

      set((state) => ({
        withdrawals: state.withdrawals.map((withdrawal) =>
          withdrawal.id === id
            ? { ...withdrawal, status: "approved" as const }
            : withdrawal
        ),
      }));
    } catch (apiError: any) {
      const status = apiError?.response?.status;
      const backendMessage =
        apiError?.response?.data?.error ||
        apiError?.response?.data?.message ||
        apiError?.message ||
        "Failed to approve withdrawal";
      console.error("approveWithdrawal failed:", { status, message: backendMessage });

      let userMessage = backendMessage;
      if (status === 403) {
        userMessage =
          "Your account does not have permission to approve withdrawals. Ask a system admin to add your email to ADMIN_EMAILS.";
      } else if (status === 404) {
        userMessage = "Withdrawal not found. Refresh the page and try again.";
      } else if (!status) {
        userMessage = "Network error. Check your connection and try again.";
      }

      set({ error: userMessage });
      throw new Error(userMessage);
    }
  },

  // Reject path: backend-only, same security rationale as approve.
  rejectWithdrawal: async (id: string) => {
    try {
      await axiosInstance.post("/withdrawals/reject", { id });

      set((state) => ({
        withdrawals: state.withdrawals.map((withdrawal) =>
          withdrawal.id === id
            ? { ...withdrawal, status: "rejected" as const }
            : withdrawal
        ),
      }));
    } catch (apiError: any) {
      const status = apiError?.response?.status;
      const backendMessage =
        apiError?.response?.data?.error ||
        apiError?.response?.data?.message ||
        apiError?.message ||
        "Failed to reject withdrawal";
      console.error("rejectWithdrawal failed:", { status, message: backendMessage });

      let userMessage = backendMessage;
      if (status === 403) {
        userMessage =
          "Your account does not have permission to reject withdrawals. Ask a system admin to add your email to ADMIN_EMAILS.";
      } else if (status === 404) {
        userMessage = "Withdrawal not found. Refresh the page and try again.";
      } else if (!status) {
        userMessage = "Network error. Check your connection and try again.";
      }

      set({ error: userMessage });
      throw new Error(userMessage);
    }
  },
}));
