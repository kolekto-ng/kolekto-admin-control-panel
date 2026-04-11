import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export type CampaignStatus =
  | "draft" | "pending_verification" | "active" | "paused"
  | "completed" | "rejected" | "pending" | "pending_review" | "closed";

export interface VerificationDocument {
  id: string; campaign_id: string; document_url: string;
  document_name: string | null; uploaded_at: string | null;
}
export interface CampaignImage {
  id: string; campaign_id: string; image_url: string;
  caption: string | null; display_order: number | null; created_at: string | null;
}
export interface CampaignDonation {
  id: string; campaign_id: string; donor_name: string | null;
  donor_email: string | null; donor_phone: string | null;
  amount: number; currency: string | null; status: string | null;
  transaction_ref: string | null; message: string | null;
  created_at: string | null; updated_at: string | null;
}
export interface SocialLink { platform: string; url: string; }
export interface CampaignStory { what?: string; why?: string; impact?: string; }

export interface Campaign {
  id: string;
  creator_id: string;
  creator_name: string;
  creator_email: string;
  creator_kyc_status: string | null;
  title: string;
  summary: string | null;
  main_image_url: string | null;
  target_amount: number | null;
  min_contribution: number | null;
  currency: string | null;
  is_open_ended: boolean | null;
  deadline: string | null;
  story_for: string | null;
  story_why: string | null;
  story_achieve: string | null;
  story: CampaignStory | null;
  phone_number: string | null;
  country_code: string | null;
  country: string | null;
  city: string | null;
  category: string | null;
  keywords: string[] | null;
  social_twitter: string | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_links: SocialLink[];
  status: CampaignStatus | null;
  created_at: string | null;
  updated_at: string | null;
  verified_at: string | null;
  campaign_summary: string | null;
  campaign_category: string | null;
  campaign_keywords: string | null;
  campaign_country: string | null;
  story_images: string[];
  banner_url: string | null;
  support_phone_number: string | null;
  verification_documents: VerificationDocument[];
  campaign_images: CampaignImage[];
  campaign_donations: CampaignDonation[];
  total_raised: number;
  contributions_count: number;
}

interface FundraisingStats {
  total: number; pending_verification: number; active: number;
  paused: number; rejected: number; closed: number;
}

interface FundraisingState {
  campaigns: Campaign[];
  selectedCampaign: Campaign | null;
  loading: boolean;
  detailLoading: boolean;
  error: string | null;
  stats: FundraisingStats;
  fetchCampaigns: () => Promise<void>;
  fetchCampaignById: (id: string) => Promise<void>;
  approveCampaign: (id: string) => Promise<{ success: boolean; error?: string }>;
  rejectCampaign: (id: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  pauseCampaign: (id: string) => Promise<{ success: boolean; error?: string }>;
  resumeCampaign: (id: string) => Promise<{ success: boolean; error?: string }>;
  closeCampaign: (id: string) => Promise<{ success: boolean; error?: string }>;
}


export const useFundraisingStore = create<FundraisingState>((set) => ({
  campaigns: [],
  selectedCampaign: null,
  loading: false,
  detailLoading: false,
  error: null,
  stats: { total: 0, pending_verification: 0, active: 0, paused: 0, rejected: 0, closed: 0 },

  fetchCampaigns: async () => {
    set({ loading: true, error: null });
    try {
      // Call the edge function that uses service role to bypass RLS
      const response = await supabase.functions.invoke('get-all-fundraising-campaigns');

      if (response.error) throw response.error;

      const { data, stats } = response.data as {
        data: Campaign[],
        stats: FundraisingStats
      };

      set({ campaigns: data || [], stats: stats || { total: 0, pending_verification: 0, active: 0, paused: 0, rejected: 0, closed: 0 }, loading: false });
    } catch (err: any) {
      console.error("Error fetching campaigns:", err);
      set({ error: "Failed to load fundraising campaigns", loading: false });
    }
  },

  fetchCampaignById: async (id: string) => {
    set({ detailLoading: true, error: null });
    try {
      // Use edge function (service role) to bypass RLS for cross-user access
      const response = await supabase.functions.invoke(
        'get-fundraising-campaign-by-id',
        { body: { id } }
      );

      if (response.error) throw response.error;

      const { data } = response.data as { data: Campaign };
      set({ selectedCampaign: data, detailLoading: false });
    } catch (err: any) {
      console.error("Error fetching campaign:", err);
      set({ error: "Failed to load campaign details", detailLoading: false });
    }
  },

  approveCampaign: async (id: string) => {
    try {
      const now = new Date().toISOString();
      const [{ error: e1 }] = await Promise.all([
        supabase.from("collections").update({ status: "active", updated_at: now }).eq("id", id),
        supabase.from("campaigns").update({ status: "active", verified_at: now, updated_at: now }).eq("id", id),
      ]);
      if (e1) throw e1;
      set((s) => ({
        campaigns: s.campaigns.map((c) => c.id === id ? { ...c, status: "active" as CampaignStatus, verified_at: now } : c),
        selectedCampaign: s.selectedCampaign?.id === id ? { ...s.selectedCampaign, status: "active" as CampaignStatus, verified_at: now } : s.selectedCampaign,
      }));
      return { success: true };
    } catch (err: any) { return { success: false, error: err.message }; }
  },

  rejectCampaign: async (id: string, reason: string) => {
    try {
      const now = new Date().toISOString();
      const [{ error: e1 }] = await Promise.all([
        supabase.from("collections").update({ status: "rejected", rejection_reason: reason, updated_at: now }).eq("id", id),
        supabase.from("campaigns").update({ status: "rejected", updated_at: now }).eq("id", id),
      ]);
      if (e1) throw e1;
      set((s) => ({
        campaigns: s.campaigns.map((c) => c.id === id ? { ...c, status: "rejected" as CampaignStatus } : c),
        selectedCampaign: s.selectedCampaign?.id === id ? { ...s.selectedCampaign, status: "rejected" as CampaignStatus } : s.selectedCampaign,
      }));
      return { success: true };
    } catch (err: any) { return { success: false, error: err.message }; }
  },

  pauseCampaign: async (id: string) => {
    try {
      const now = new Date().toISOString();
      await Promise.all([
        supabase.from("collections").update({ status: "paused", updated_at: now }).eq("id", id),
        supabase.from("campaigns").update({ status: "paused", updated_at: now }).eq("id", id),
      ]);
      set((s) => ({
        campaigns: s.campaigns.map((c) => c.id === id ? { ...c, status: "paused" as CampaignStatus } : c),
        selectedCampaign: s.selectedCampaign?.id === id ? { ...s.selectedCampaign, status: "paused" as CampaignStatus } : s.selectedCampaign,
      }));
      return { success: true };
    } catch (err: any) { return { success: false, error: err.message }; }
  },

  resumeCampaign: async (id: string) => {
    try {
      const now = new Date().toISOString();
      await Promise.all([
        supabase.from("collections").update({ status: "active", updated_at: now }).eq("id", id),
        supabase.from("campaigns").update({ status: "active", updated_at: now }).eq("id", id),
      ]);
      set((s) => ({
        campaigns: s.campaigns.map((c) => c.id === id ? { ...c, status: "active" as CampaignStatus } : c),
        selectedCampaign: s.selectedCampaign?.id === id ? { ...s.selectedCampaign, status: "active" as CampaignStatus } : s.selectedCampaign,
      }));
      return { success: true };
    } catch (err: any) { return { success: false, error: err.message }; }
  },

  closeCampaign: async (id: string) => {
    try {
      const now = new Date().toISOString();
      await Promise.all([
        supabase.from("collections").update({ status: "closed", updated_at: now }).eq("id", id),
        supabase.from("campaigns").update({ status: "closed", updated_at: now }).eq("id", id),
      ]);
      set((s) => ({
        campaigns: s.campaigns.map((c) => c.id === id ? { ...c, status: "closed" as CampaignStatus } : c),
        selectedCampaign: s.selectedCampaign?.id === id ? { ...s.selectedCampaign, status: "closed" as CampaignStatus } : s.selectedCampaign,
      }));
      return { success: true };
    } catch (err: any) { return { success: false, error: err.message }; }
  },
}));
