import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export type VerificationStatus = "verified" | "pending" | "rejected" | "unverified";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  collections: number;
  totalRaised: number;
  status: "active" | "inactive";
  verificationStatus: VerificationStatus;
  dateOfBirth: string | null;
}

interface UsersState {
  users: User[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  getUserById: (id: string) => User | undefined;
}

export const useUsersStore = create<UsersState>((set, get) => ({
  users: [],
  loading: false,
  error: null,

  fetchUsers: async () => {
    set({ loading: true, error: null });

    try {
      // Fetch profiles
      const { data: profilesData, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!profilesData || profilesData.length === 0) {
        set({ users: [], loading: false });
        return;
      }

      const userIds = profilesData.map((p) => p.id);

      // Batch fetch KYC verification statuses
      const { data: kycData } = await supabase
        .from("kyc_verifications")
        .select("user_id, status")
        .in("user_id", userIds);

      const kycMap: Record<string, string> = {};
      (kycData || []).forEach((k) => {
        kycMap[k.user_id] = k.status;
      });

      // Get collection counts per user
      const { data: collectionsData } = await supabase
        .from("collections")
        .select("user_id")
        .in("user_id", userIds);

      const collectionCountMap: Record<string, number> = {};
      (collectionsData || []).forEach((c) => {
        collectionCountMap[c.user_id] = (collectionCountMap[c.user_id] || 0) + 1;
      });

      // Build user list
      const usersWithStats: User[] = profilesData.map((profile) => {
        const kycStatus = kycMap[profile.id];
        let verificationStatus: VerificationStatus = "unverified";
        if (kycStatus === "verified") verificationStatus = "verified";
        else if (kycStatus === "pending" || kycStatus === "reviewing") verificationStatus = "pending";
        else if (kycStatus === "rejected") verificationStatus = "rejected";

        return {
          id: profile.id,
          name: profile.full_name || "Unknown User",
          email: profile.email,
          phone: profile.phone_number || "",
          joinDate: profile.created_at || "",
          collections: collectionCountMap[profile.id] || 0,
          totalRaised: 0,
          status: "active" as const,
          verificationStatus,
          dateOfBirth: profile.date_of_birth || null,
        };
      });

      set({ users: usersWithStats, loading: false });
    } catch (error) {
      console.error("Error fetching users:", error);
      set({
        users: [],
        error: "Failed to load users from database",
        loading: false,
      });
    }
  },

  getUserById: (id: string) => {
    return get().users.find((user) => user.id === id);
  },
}));
