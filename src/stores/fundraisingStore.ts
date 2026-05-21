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
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("campaigns")
        .select(`
          id,
          title,
          city,
          country,
          creator_id,
          category,
          target_amount,
          status,
          created_at,
          verification_documents(id),
          campaign_donations(amount, status)
        `)
        .order("created_at", { ascending: false });

      if (campaignsError) throw campaignsError;

      const items = campaignsData || [];
      const creatorIds = [...new Set(items.map((c) => c.creator_id).filter(Boolean))];

      let profilesMap: Record<string, { full_name: string | null; email: string | null }> = {};
      if (creatorIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", creatorIds);

        if (profilesError) throw profilesError;

        (profilesData || []).forEach((p) => {
          profilesMap[p.id] = p;
        });
      }

      const normalizeStatus = (status: string | null): CampaignStatus => {
        if (!status) return "draft";
        const s = status.toLowerCase().replace(/\s+/g, "_");
        if (s === "pending_review") return "pending_verification";
        return s as CampaignStatus;
      };

      const mappedCampaigns: Campaign[] = items.map((camp: any) => {
        const profile = profilesMap[camp.creator_id];
        const donations = camp.campaign_donations || [];
        const totalRaised = donations
          .filter((d: any) => d.status === "success" || d.status === "paid")
          .reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);

        const status = normalizeStatus(camp.status);

        return {
          id: camp.id,
          creator_id: camp.creator_id,
          creator_name: profile?.full_name || profile?.email || "Unknown",
          creator_email: profile?.email || "",
          creator_kyc_status: "unverified",
          title: camp.title || "",
          summary: null,
          main_image_url: null,
          target_amount: camp.target_amount ? Number(camp.target_amount) : null,
          min_contribution: null,
          currency: "NGN",
          is_open_ended: null,
          deadline: null,
          story_for: null,
          story_why: null,
          story_achieve: null,
          story: null,
          phone_number: null,
          country_code: "NG +234",
          country: camp.country || "Nigeria",
          city: camp.city || null,
          category: camp.category || null,
          keywords: null,
          social_twitter: null,
          social_instagram: null,
          social_facebook: null,
          social_links: [],
          status,
          created_at: camp.created_at,
          updated_at: null,
          verified_at: null,
          campaign_summary: null,
          campaign_category: camp.category || null,
          campaign_keywords: null,
          campaign_country: camp.country || null,
          story_images: [],
          banner_url: null,
          support_phone_number: null,
          verification_documents: camp.verification_documents || [],
          campaign_images: [],
          campaign_donations: [],
          total_raised: totalRaised,
          contributions_count: 0,
        };
      });

      const stats: FundraisingStats = {
        total: mappedCampaigns.length,
        pending_verification: mappedCampaigns.filter((c) => c.status === "pending_verification" || c.status === "pending").length,
        active: mappedCampaigns.filter((c) => c.status === "active").length,
        paused: mappedCampaigns.filter((c) => c.status === "paused").length,
        rejected: mappedCampaigns.filter((c) => c.status === "rejected").length,
        closed: mappedCampaigns.filter((c) => c.status === "closed" || c.status === "completed").length,
      };

      set({ campaigns: mappedCampaigns, stats, loading: false });
    } catch (err: any) {
      console.error("Error fetching campaigns:", err);
      set({ error: "Failed to load fundraising campaigns", loading: false });
    }
  },

  fetchCampaignById: async (id: string) => {
    set({ detailLoading: true, error: null });
    try {
      const { data: camp, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (campaignError) throw campaignError;
      if (!camp) throw new Error("Campaign not found");

      const [profileRes, docsRes, imgRes, donRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, kyc_verifications(status)")
          .eq("id", camp.creator_id)
          .maybeSingle(),
        supabase.from("verification_documents").select("*").eq("campaign_id", id),
        supabase.from("campaign_images").select("*").eq("campaign_id", id),
        supabase.from("campaign_donations").select("*").eq("campaign_id", id),
      ]);

      const profile = profileRes?.data;
      const kycStatus = profile?.kyc_verifications
        ? (Array.isArray(profile.kyc_verifications)
            ? profile.kyc_verifications[0]?.status
            : (profile.kyc_verifications as any)?.status)
        : null;

      const donations = donRes?.data || [];
      const totalRaised = donations
        .filter((d: any) => d.status === "success" || d.status === "paid")
        .reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);

      const socialLinks: SocialLink[] = [];
      if (camp.social_twitter) socialLinks.push({ platform: "twitter", url: camp.social_twitter });
      if (camp.social_instagram) socialLinks.push({ platform: "instagram", url: camp.social_instagram });
      if (camp.social_facebook) socialLinks.push({ platform: "facebook", url: camp.social_facebook });

      const storyImages = camp.main_image_url ? [camp.main_image_url] : [];

      const normalizeStatus = (status: string | null): CampaignStatus => {
        if (!status) return "draft";
        const s = status.toLowerCase().replace(/\s+/g, "_");
        if (s === "pending_review") return "pending_verification";
        return s as CampaignStatus;
      };

      const mappedCampaign: Campaign = {
        id: camp.id,
        creator_id: camp.creator_id,
        creator_name: profile?.full_name || profile?.email || "Unknown",
        creator_email: profile?.email || "",
        creator_kyc_status: kycStatus || "unverified",
        title: camp.title || "",
        summary: camp.summary || null,
        main_image_url: camp.main_image_url || null,
        target_amount: camp.target_amount ? Number(camp.target_amount) : null,
        min_contribution: camp.min_contribution ? Number(camp.min_contribution) : null,
        currency: camp.currency || "NGN",
        is_open_ended: camp.is_open_ended || false,
        deadline: camp.deadline || null,
        story_for: camp.story_for || null,
        story_why: camp.story_why || null,
        story_achieve: camp.story_achieve || null,
        story: null,
        phone_number: camp.phone_number || null,
        country_code: camp.country_code || "NG +234",
        country: camp.country || "Nigeria",
        city: camp.city || null,
        category: camp.category || null,
        keywords: camp.keywords || null,
        social_twitter: camp.social_twitter || null,
        social_instagram: camp.social_instagram || null,
        social_facebook: camp.social_facebook || null,
        social_links: socialLinks,
        status: normalizeStatus(camp.status),
        created_at: camp.created_at,
        updated_at: camp.updated_at,
        verified_at: camp.verified_at || null,
        campaign_summary: camp.summary || null,
        campaign_category: camp.category || null,
        campaign_keywords: camp.keywords ? camp.keywords.join(", ") : null,
        campaign_country: camp.country || null,
        story_images: storyImages,
        banner_url: camp.main_image_url || null,
        support_phone_number: camp.phone_number || null,
        verification_documents: docsRes?.data || [],
        campaign_images: imgRes?.data || [],
        campaign_donations: donations,
        total_raised: totalRaised,
        contributions_count: donations.length,
      };

      set({ selectedCampaign: mappedCampaign, detailLoading: false });
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
