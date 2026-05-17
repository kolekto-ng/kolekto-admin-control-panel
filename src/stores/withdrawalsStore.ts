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
  loading: boolean;
  error: string | null;
  fetchWithdrawals: () => Promise<void>;
  getWithdrawalById: (id: string) => Withdrawal | undefined;
  approveWithdrawal: (id: string) => Promise<void>;
  rejectWithdrawal: (id: string) => Promise<void>;
}

export const useWithdrawalsStore = create<WithdrawalsState>((set, get) => ({
  withdrawals: [],
  loading: false,
  error: null,

  fetchWithdrawals: async () => {
    set({ loading: true, error: null });

    try {
      const { data: withdrawalsData, error } = await supabase
        .from("withdrawals")
        .select(
          `
          *,
          collections (
            title          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const withdrawalsWithProfiles = await Promise.all(
        withdrawalsData.map(async (w) => {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .eq("id", w.user_id)
            .single();

          if (profileError) console.error(profileError);

          return {
            ...w,
            profile, // attach profile objec
          };
        })
      );

      console.log(withdrawalsWithProfiles, "withdrawalsWithProfiles");

      const formattedWithdrawals: Withdrawal[] =
        withdrawalsWithProfiles?.map((withdrawal: any) => ({
          id: withdrawal.id,
          collectionId: withdrawal.collection_id,
          collectionName: withdrawal.collections?.title || "Unknown Collection",
          hostId: withdrawal.user_id,
          hostName: withdrawal.profile?.full_name || "Unknown Host",
          hostEmail: withdrawal.profile?.email || "unknown@example.com",
          requestedAmount: withdrawal.amount,
          dateRequested: withdrawal.created_at,
          status: withdrawal.status,
          bankName:
            withdrawal.destination_account.bank_name ||
            withdrawal.destination_account.bank_code ||
            "Unknown Bank",
          accountNumber: withdrawal.destination_account.accountNumber,
          accountName: withdrawal.destination_account.accountName,
        })) || [];

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
