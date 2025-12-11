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

  approveWithdrawal: async (id: string) => {
    try {
      console.log("Approving withdrawal with ID:", id);

      const { error } = await supabase
        .from("withdrawals")
        .update({ status: "approved" })
        .eq("id", id);

      if (error) {
        throw error;
      }

      // Update local state
      set((state) => ({
        withdrawals: state.withdrawals.map((withdrawal) =>
          withdrawal.id === id
            ? { ...withdrawal, status: "approved" as const }
            : withdrawal
        ),
      }));
    } catch (error) {
      console.error("Error approving withdrawal:", error);
      set({ error: "Failed to approve withdrawal" });
      throw error;
    }
  },

  rejectWithdrawal: async (id: string) => {
    try {
      console.log("Rejecting withdrawal with ID:", id);

      const { error } = await supabase
        .from("withdrawals")
        .update({ status: "rejected" })
        .eq("id", id);

      if (error) {
        throw error;
      }

      // Update local state
      set((state) => ({
        withdrawals: state.withdrawals.map((withdrawal) =>
          withdrawal.id === id
            ? { ...withdrawal, status: "rejected" as const }
            : withdrawal
        ),
      }));
    } catch (error) {
      console.error("Error rejecting withdrawal:", error);
      set({ error: "Failed to reject withdrawal" });
      throw error;
    }
  },
}));
