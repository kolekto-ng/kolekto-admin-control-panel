import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  collections: number;
  totalRaised: number;
  status: "active" | "inactive";
}

interface UsersState {
  users: User[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  getUserById: (id: string) => User | undefined;
}

// Demo user data
const demoUser: User = {
  id: "demo-user-001",
  name: "John Doe",
  email: "john.doe@demo.com",
  phone: "+234 801 234 5678",
  joinDate: new Date().toISOString(),
  collections: 3,
  totalRaised: 125000,
  status: "active",
};

export const useUsersStore = create<UsersState>((set, get) => ({
  users: [],
  loading: false,
  error: null,

  fetchUsers: async () => {
    set({ loading: true, error: null });

    try {
      const { data: profilesData, error } = await supabase
        .from("profiles")
        .select("*, collections(*, wallets(net_payment))")
        .order("created_at", { ascending: false });
        console.log(profilesData) 
      if (error) {
        throw error;
      }

      let usersWithStats: User[] = [];

      if (profilesData && profilesData.length > 0) {
        // Get collection stats for each user
        usersWithStats = await Promise.all(
          profilesData.map(async (profile) => {
            
            // Get total raised amount from wallets (net_payment represents actual collected amount)
            // const { data: walletsData } = await supabase
            //   .from("wallets")
            //   .select("net_payment, collection_id")
            //   .in(
            //     "collection_id",
            //     await supabase
            //       .from("collections")
            //       .select("id")
            //       .eq("user_id", profile.id)
            //       .then(({ data }) => data?.map((c) => c.id) || [])
            //   );
         
            // const totalRaised =
            //   walletsData?.reduce(
            //     (sum, wallet) => sum + (Number(wallet.net_payment) || 0),
            //     0
            //   ) || 0;

            return {
              id: profile.id,
              name: profile.full_name || "Unknown User",
              email: profile.email,
              phone: profile.phone_number || "",
              joinDate: profile.created_at || "",
              collections: profile.collections.length || 0,
              totalRaised: 0,
              status: "active" as const,
            };
          })
        );
      }

      // Add demo user to the beginning of the list
      const allUsers = [...usersWithStats];

      set({
        users: allUsers,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      // If there's an error, still show the demo user
      set({
        users: [demoUser],
        error: "Failed to load users from database, showing demo data",
        loading: false,
      });
    }
  },

  getUserById: (id: string) => {
    return get().users.find((user) => user.id === id);
  },
}));
