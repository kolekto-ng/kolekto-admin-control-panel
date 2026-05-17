import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export interface Collection {
  data: any;
  id: string;
  title: string;
  description: string;
  organizer: string;
  userId: string;
  targetAmount: number;
  raisedAmount: number;
  totalBalance: number;
  availableBalance: number;
  pendingBalance: number;
  contributors: number;
  status: "active" | "completed" | "paused";
  type: string;
  deadline: string;
  createdAt: string;
}

interface CollectionsState {
  collections: Collection[];
  loading: boolean;
  error: string | null;
  fetchCollections: () => Promise<void>;
  getCollectionById: (id: string) => Collection | undefined;
}

export const useCollectionsStore = create<CollectionsState>((set, get) => ({
  collections: [],
  loading: false,
  error: null,

  fetchCollections: async () => {
    set({ loading: true, error: null });

    try {
      const { data: collectionsData, error } = await supabase
        .from("collections")
        .select('*')
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      // Collect user IDs for batch fetching profiles
      const userIds = [...new Set(collectionsData?.map((c: any) => c.user_id) || [])];

      let profilesMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        if (profilesData) {
          profilesMap = profilesData.reduce((acc: any, profile: any) => {
            acc[profile.id] = profile;
            return acc;
          }, {});
        }
      }

      // Get contributors count for each collection
      const collectionsWithStats = await Promise.all(
        collectionsData?.map(async (collection: any) => {
          // Flatten wallet fetch?
          const { data: wallet } = await supabase
            .from("wallets")
            .select("*")
            .eq("collection_id", collection.id);

          const profile = profilesMap[collection.user_id];
          const organizerName = profile
            ? (profile.full_name || profile.email || "Unknown User")
            : "Unknown Organizer";

          return {
            data: collectionsData,
            id: collection.id,
            title: collection.title,
            description: collection.description || "",
            organizer: organizerName,
            userId: collection.user_id,
            targetAmount: Number(collection.amount),
            raisedAmount: Number(collection.total_contributions || 0), // Use the aggregate from DB if available, or we'll need to sum it
            totalBalance: Number(wallet?.[0]?.ledger_balance || 0),
            totalWithdrawn: Number(wallet?.[0]?.withdrawn || 0),
            wallet: wallet,
            availableBalance: Number(wallet?.[0]?.available_balance || 0),
            pendingBalance: Number(wallet?.[0]?.ledger_balance || 0) - Number(wallet?.[0]?.available_balance || 0),
            contributors: +collection.total_contributions_count || +collection.total_contributions || 0,
            status: collection.status,
            type: collection.type,
            deadline: collection.deadline || "",
            createdAt: collection.created_at,
          };
        }) || []
      );

      set({
        collections: collectionsWithStats,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching collections:", error);
      set({
        error: "Failed to load collections",
        loading: false,
      });
    }
  },

  getCollectionById: (id: string) => {
    return get().collections.find((collection) => collection.id === id);
  },
}));
