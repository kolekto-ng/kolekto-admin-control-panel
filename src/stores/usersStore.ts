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
      // Fetch profiles with nested collections and KYC status (single consolidated query, limited columns)
      const { data: profilesData, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          phone_number,
          created_at,
          date_of_birth,
          collections(id),
          kyc_verifications(status)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!profilesData || profilesData.length === 0) {
        set({ users: [], loading: false });
        return;
      }

      // Build user list
      const usersWithStats: User[] = (profilesData as any[]).map((profile) => {
        // Extract KYC status
        let kycStatus = "unverified";
        if (profile.kyc_verifications) {
          if (Array.isArray(profile.kyc_verifications)) {
            if (profile.kyc_verifications.length > 0) {
              kycStatus = profile.kyc_verifications[0]?.status || "unverified";
            }
          } else {
            kycStatus = profile.kyc_verifications.status || "unverified";
          }
        }

        let verificationStatus: VerificationStatus = "unverified";
        if (kycStatus === "verified") verificationStatus = "verified";
        else if (kycStatus === "pending" || kycStatus === "reviewing") verificationStatus = "pending";
        else if (kycStatus === "rejected") verificationStatus = "rejected";

        // Count collections
        const collectionsCount = Array.isArray(profile.collections) ? profile.collections.length : 0;

        return {
          id: profile.id,
          name: profile.full_name || "Unknown User",
          email: profile.email || "",
          phone: profile.phone_number || "",
          joinDate: profile.created_at || "",
          collections: collectionsCount,
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
