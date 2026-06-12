import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export interface Collection {
  data: any;
  id: string;
  title: string;
  description: string;
  organizer: string;
  userId: string;
  // New canonical type field
  collection_type: string;
  // Legacy type field (kept for backwards compat)
  type: string;
  targetAmount: number;
  raisedAmount: number;
  totalBalance: number;
  availableBalance: number;
  pendingBalance: number;
  contributors: number;
  status: string;
  deadline: string;
  createdAt: string;
  // New fields from backend
  slug: string | null;
  rejection_reason: string | null;
  min_contribution: number;
  target_amount: number | null;
  event_date: string | null;
  ticket_mode: string | null;
  allow_multiple_quantity: boolean;
  is_open_ended: boolean;
  auto_close: boolean;
  campaign_category: string | null;
  campaign_summary: string | null;
  campaign_keywords: string | null;
  campaign_country: string;
  social_links: any[];
  banner_url: string | null;
  price_tiers: any[];
  story: any | null;
  story_images: any[];
  unique_id_enabled: boolean;
  fee_bearer: string;
  wallet: any;
  availableBalance: number;
  totalWithdrawn: number;
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
        .select(`
          id,
          title,
          slug,
          collection_type,
          type,
          user_id,
          target_amount,
          amount,
          total_contributions,
          status,
          created_at,
          organizer:user_id(full_name, email),
          wallets(net_payment, withdrawn, available_balance, pending_balance, ledger_balance)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const collectionsWithStats = collectionsData?.map((collection: any) => {
        // Because the foreign key is on the wallets table, Supabase returns an array of wallets.
        // We take the first one (or null if none exist).
        const wallet = collection.wallets || null;
        const profile = collection.organizer;
        const organizerName = profile
          ? (profile.full_name || profile.email || "Unknown User")
          : "Unknown Organizer";

        // Determine canonical collection_type: prefer new field, fallback to legacy type
        const collectionType = collection.collection_type || collection.type || 'fixed';

        return {
          data: collection,
          id: collection.id,
          title: collection.title,
          description: collection.description || "",
          organizer: organizerName,
          userId: collection.user_id,
          collection_type: collectionType,
          type: collection.type || 'flat',
          targetAmount: Number(collection.target_amount || collection.amount || 0),
          // Total Raised = total ever received (net of fees), NOT ledger_balance
          // (which decreases when withdrawals happen). Use net_payment.
          raisedAmount: Number(wallet?.net_payment || 0),
          totalWithdrawn: Number(wallet?.withdrawn || 0),
          wallet: wallet || null,
          availableBalance: Number(wallet?.available_balance || 0),
          pendingBalance: Number(wallet?.pending_balance || 0),
          totalBalance: Number(wallet?.ledger_balance || 0),
          contributors: +collection.total_contributions || 0,
          status: collection.status,
          deadline: collection.deadline || "",
          createdAt: collection.created_at,
          // New fields
          slug: collection.slug || null,
          rejection_reason: collection.rejection_reason || null,
          min_contribution: Number(collection.min_contribution || 0),
          target_amount: collection.target_amount ? Number(collection.target_amount) : null,
          event_date: collection.event_date || null,
          ticket_mode: collection.ticket_mode || null,
          allow_multiple_quantity: collection.allow_multiple_quantity ?? true,
          is_open_ended: collection.is_open_ended ?? false,
          auto_close: collection.auto_close ?? false,
          campaign_category: collection.campaign_category || null,
          campaign_summary: collection.campaign_summary || null,
          campaign_keywords: collection.campaign_keywords || null,
          campaign_country: collection.campaign_country || 'Nigeria',
          social_links: Array.isArray(collection.social_links) ? collection.social_links : [],
          banner_url: collection.banner_url || null,
          price_tiers: Array.isArray(collection.price_tiers) ? collection.price_tiers : [],
          story: collection.story || null,
          story_images: Array.isArray(collection.story_images) ? collection.story_images : [],
          unique_id_enabled: collection.unique_id_enabled ?? false,
          fee_bearer: collection.fee_bearer || 'organizer',
        };
      }) || [];

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
