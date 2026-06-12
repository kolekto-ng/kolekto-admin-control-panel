import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────────

export type KYCStatus = "pending" | "reviewing" | "verified" | "rejected";
export type DocumentType = "identity" | "address" | "bank" | "bvn";

export interface KYCFile {
  id: string;
  document_id: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_at: string | null;
  signed_url?: string;
}

export interface KYCDocument {
  id: string;
  user_id: string;
  kyc_verification_id: string | null;
  document_type: DocumentType;
  verification_type: string;
  status: KYCStatus | null;
  rejection_reason: string | null;
  verified_by: string | null;
  verified_at: string | null;
  uploaded_at: string | null;
  updated_at: string | null;
  files: KYCFile[];
}

export interface KYCVerification {
  id: string;
  user_id: string;
  status: KYCStatus;
  identity_verified: boolean;
  address_verified: boolean;
  nin_verified: boolean;
  bank_verified: boolean;
  selfie_verified: boolean;
  bvn_verified: boolean;
  completed_at: string | null;
  updated_at: string;
  // Joined relations
  profile?: KYCProfile | null;
  kyc_documents?: KYCDocument[];
  kyc_verification_history?: KYCHistoryEntry[];
}

export interface KYCProfile {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  date_of_birth: string | null;
  address: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

export interface KYCHistoryEntry {
  id: string;
  user_id: string;
  verification_id: string | null;
  old_status: string | null;
  new_status: string | null;
  changed_by: string | null;
  change_reason: string | null;
  changed_at: string | null;
}

export interface KYCUserListItem {
  user_id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  date_of_birth: string | null;
  avatar_url: string | null;
  kyc_status: KYCStatus;
  submitted_at: string | null;
  identity_verified: boolean;
  address_verified: boolean;
}

export interface KYCUserDetail {
  user_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  date_of_birth: string | null;
  address: string | null;
  avatar_url: string | null;
  created_at: string | null;
  // KYC Verification summary
  verification: KYCVerification | null;
  // NIN info
  nin_last4: string | null;
  // Documents grouped by type
  documents: KYCDocument[];
  // History
  history: KYCHistoryEntry[];
}

export interface KYCStats {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  reviewing: number;
}

// Pre-set rejection reasons
export const REJECTION_REASONS = [
  "Document is blurry or unreadable",
  "Wrong document type submitted",
  "Document has expired",
  "Name on document doesn't match profile",
  "Address on document doesn't match stated address",
  "Document is incomplete or partially uploaded",
  "Suspected fraudulent document",
  "Document format not supported",
];

// ── Store ──────────────────────────────────────────────────────────────────────

interface KYCState {
  // List view
  kycUsers: KYCUserListItem[];
  stats: KYCStats;
  loading: boolean;
  error: string | null;

  // Detail view
  selectedUser: KYCUserDetail | null;
  detailLoading: boolean;

  // Actions
  fetchKYCList: () => Promise<void>;
  fetchKYCDetail: (userId: string) => Promise<void>;
  // Returns a signed URL for a given storage path. Called on-demand when viewing a file.
  getSignedUrl: (filePath: string) => Promise<string>;
  approveDocument: (documentId: string, userId: string) => Promise<{ success: boolean; error?: string }>;
  rejectDocument: (documentId: string, userId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  approveNIN: (userId: string) => Promise<{ success: boolean; error?: string }>;
  rejectNIN: (userId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  addFeedback: (userId: string, verificationId: string, feedback: string) => Promise<{ success: boolean; error?: string }>;
}

export const useKYCStore = create<KYCState>((set, get) => ({
  kycUsers: [],
  stats: { total: 0, pending: 0, verified: 0, rejected: 0, reviewing: 0 },
  loading: false,
  error: null,
  selectedUser: null,
  detailLoading: false,

  // ── Fetch KYC List ─────────────────────────────────────────────────────────

  fetchKYCList: async () => {
    set({ loading: true, error: null });
    try {
      // Single query: verifications + profile join
      const { data: verifications, error: vError } = await supabase
        .from("kyc_verifications")
        .select(`
          *,
          profile:user_id (
            id, full_name, email, phone_number, date_of_birth, avatar_url
          )
        `)
        .order("updated_at", { ascending: false });

      if (vError) throw vError;

      if (!verifications || verifications.length === 0) {
        set({
          kycUsers: [],
          stats: { total: 0, pending: 0, verified: 0, rejected: 0, reviewing: 0 },
          loading: false,
        });
        return;
      }

      // Build list items directly from joined data
      const kycUsers: KYCUserListItem[] = verifications.map((v: any) => {
        const profile = v.profile || {};
        return {
          user_id: v.user_id,
          full_name: profile.full_name || "Unknown",
          email: profile.email || "",
          phone_number: profile.phone_number || null,
          date_of_birth: profile.date_of_birth || null,
          avatar_url: profile.avatar_url || null,
          kyc_status: v.status as KYCStatus,
          submitted_at: v.updated_at,
          identity_verified: v.identity_verified || false,
          address_verified: v.address_verified || false,
        };
      });

      // Compute stats
      const stats: KYCStats = {
        total: kycUsers.length,
        pending: kycUsers.filter((u) => u.kyc_status === "pending").length,
        verified: kycUsers.filter((u) => u.kyc_status === "verified").length,
        rejected: kycUsers.filter((u) => u.kyc_status === "rejected").length,
        reviewing: kycUsers.filter((u) => u.kyc_status === "reviewing").length,
      };

      set({ kycUsers, stats, loading: false });
    } catch (err: any) {
      console.error("Error fetching KYC list:", err);
      set({ error: "Failed to load KYC submissions", loading: false });
    }
  },

  // ── Fetch KYC Detail ───────────────────────────────────────────────────────

  fetchKYCDetail: async (userId: string) => {
    set({ detailLoading: true, error: null });
    try {
      // Single joined query: verification + profile + documents + files + history
      const { data: verificationData, error: vError } = await supabase
        .from("kyc_verifications")
        .select(`
          *,
          profile:user_id (
            id, full_name, first_name, last_name, email,
            phone_number, date_of_birth, address, avatar_url, created_at
          ),
          kyc_documents (
            *,
            kyc_files (*)
          ),
          kyc_verification_history (
            *
          )
        `)
        .eq("user_id", userId)
        .order("uploaded_at", { ascending: false, referencedTable: "kyc_documents" })
        .order("changed_at", { ascending: false, referencedTable: "kyc_verification_history" })
        .single();

      if (vError) throw vError;

      // NIN is still a separate query (encrypted separately, not joined via profiles)
      const { data: identityData } = await supabase
        .from("user_identity")
        .select("nin_last4")
        .eq("user_id", userId)
        .single();

      const profile: KYCProfile = verificationData.profile || {};
      const rawDocuments: any[] = verificationData.kyc_documents || [];
      const history: KYCHistoryEntry[] = verificationData.kyc_verification_history || [];

      // Store files as-is — signed URLs are generated lazily when a file is viewed
      const enrichedDocuments: KYCDocument[] = rawDocuments.map((doc: any) => ({
        ...doc,
        document_type: doc.document_type as DocumentType,
        status: doc.status as KYCStatus | null,
        files: (doc.kyc_files || []) as KYCFile[],
      }));

      // Strip the nested relations from the verification object
      const { profile: _p, kyc_documents: _d, kyc_verification_history: _h, ...cleanVerification } =
        verificationData as any;

      const detail: KYCUserDetail = {
        user_id: profile.id,
        full_name: profile.full_name || "",
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        email: profile.email || "",
        phone_number: profile.phone_number || null,
        date_of_birth: profile.date_of_birth || null,
        address: profile.address || null,
        avatar_url: profile.avatar_url || null,
        created_at: profile.created_at || null,
        verification: cleanVerification as KYCVerification,
        nin_last4: identityData?.nin_last4 || null,
        documents: enrichedDocuments,
        history,
      };

      set({ selectedUser: detail, detailLoading: false });
    } catch (err: any) {
      console.error("Error fetching KYC detail:", err);
      set({ error: "Failed to load KYC details", detailLoading: false });
    }
  },

  // ── Get Signed URL (on-demand) ─────────────────────────────────────────────

  getSignedUrl: async (filePath: string): Promise<string> => {
    try {
      const { data, error } = await supabase.storage
        .from("kyc-documents")
        .createSignedUrl(filePath, 3600);
      if (error || !data?.signedUrl) return "";
      return data.signedUrl;
    } catch {
      return "";
    }
  },

  // ── Approve Document ───────────────────────────────────────────────────────

  approveDocument: async (documentId: string, userId: string) => {
    try {
      // Update document status
      const { error: docError } = await supabase
        .from("kyc_documents")
        .update({
          status: "verified",
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq("id", documentId);

      if (docError) throw docError;

      // Re-evaluate overall verification status
      await recalculateVerificationStatus(userId);

      // Log history
      const verification = get().selectedUser?.verification;
      await supabase.from("kyc_verification_history").insert({
        user_id: userId,
        verification_id: verification?.id || null,
        old_status: verification?.status || "pending",
        new_status: "verified",
        change_reason: "Document approved by admin",
        changed_at: new Date().toISOString(),
      });

      // Refresh detail
      await get().fetchKYCDetail(userId);
      // Refresh list in background
      get().fetchKYCList();

      return { success: true };
    } catch (err: any) {
      console.error("Error approving document:", err);
      return { success: false, error: err.message };
    }
  },

  // ── Reject Document ────────────────────────────────────────────────────────

  rejectDocument: async (documentId: string, userId: string, reason: string) => {
    try {
      // Update document status with rejection reason
      const { error: docError } = await supabase
        .from("kyc_documents")
        .update({
          status: "rejected",
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      if (docError) throw docError;

      // Re-evaluate overall verification status
      await recalculateVerificationStatus(userId);

      // Log history
      const verification = get().selectedUser?.verification;
      await supabase.from("kyc_verification_history").insert({
        user_id: userId,
        verification_id: verification?.id || null,
        old_status: verification?.status || "pending",
        new_status: "rejected",
        change_reason: reason,
        changed_at: new Date().toISOString(),
      });

      // Refresh
      await get().fetchKYCDetail(userId);
      get().fetchKYCList();

      return { success: true };
    } catch (err: any) {
      console.error("Error rejecting document:", err);
      return { success: false, error: err.message };
    }
  },

  // ── Approve NIN ───────────────────────────────────────────────────────────

  approveNIN: async (userId: string) => {
    try {
      const { error } = await supabase
        .from("kyc_verifications")
        .update({ nin_verified: true, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (error) throw error;

      // Re-evaluate overall verification status (may now be "verified" if docs also approved)
      await recalculateVerificationStatus(userId);

      // Log history
      const verification = get().selectedUser?.verification;
      await supabase.from("kyc_verification_history").insert({
        user_id: userId,
        verification_id: verification?.id || null,
        old_status: verification?.status || "pending",
        new_status: verification?.status || "pending",
        change_reason: "NIN approved by admin",
        changed_at: new Date().toISOString(),
      });

      await get().fetchKYCDetail(userId);
      get().fetchKYCList();
      return { success: true };
    } catch (err: any) {
      console.error("Error approving NIN:", err);
      return { success: false, error: err.message };
    }
  },

  // ── Reject NIN ────────────────────────────────────────────────────────────

  rejectNIN: async (userId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from("kyc_verifications")
        .update({ nin_verified: false, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (error) throw error;

      // Log history
      const verification = get().selectedUser?.verification;
      await supabase.from("kyc_verification_history").insert({
        user_id: userId,
        verification_id: verification?.id || null,
        old_status: verification?.status || "pending",
        new_status: "rejected",
        change_reason: `NIN rejected: ${reason}`,
        changed_at: new Date().toISOString(),
      });

      await get().fetchKYCDetail(userId);
      get().fetchKYCList();
      return { success: true };
    } catch (err: any) {
      console.error("Error rejecting NIN:", err);
      return { success: false, error: err.message };
    }
  },

  // ── Add Feedback Note ──────────────────────────────────────────────────────

  addFeedback: async (userId: string, verificationId: string, feedback: string) => {
    try {
      await supabase.from("kyc_verification_history").insert({
        user_id: userId,
        verification_id: verificationId,
        old_status: null,
        new_status: null,
        change_reason: feedback,
        changed_at: new Date().toISOString(),
      });

      // Refresh detail
      await get().fetchKYCDetail(userId);

      return { success: true };
    } catch (err: any) {
      console.error("Error adding feedback:", err);
      return { success: false, error: err.message };
    }
  },
}));

// ── Helper: Recalculate overall KYC verification status ────────────────────

async function recalculateVerificationStatus(userId: string) {
  // Fetch all documents via kyc_verification_id join (more efficient now that FK exists)
  const { data: verification } = await supabase
    .from("kyc_verifications")
    .select("id, nin_verified, kyc_documents(document_type, status)")
    .eq("user_id", userId)
    .single();

  if (!verification) return;

  const allDocs: { document_type: string; status: string | null }[] =
    (verification as any).kyc_documents || [];

  if (allDocs.length === 0) return;

  // Group by document type — verified wins
  const typeStatusMap: Record<string, string> = {};
  allDocs.forEach((doc) => {
    if (doc.status === "verified") {
      typeStatusMap[doc.document_type] = "verified";
    } else if (!typeStatusMap[doc.document_type]) {
      typeStatusMap[doc.document_type] = doc.status || "pending";
    }
  });

  const identityVerified = typeStatusMap["identity"] === "verified";
  const addressVerified = typeStatusMap["address"] === "verified";
  const ninVerified = verification.nin_verified || false;

  // Determine overall status
  const anyRejected = allDocs.some((d) => d.status === "rejected");
  const allRequiredVerified = identityVerified && addressVerified && ninVerified;

  let overallStatus: KYCStatus = "pending";
  if (allRequiredVerified) {
    overallStatus = "verified";
  } else if (anyRejected) {
    overallStatus = "rejected";
  } else if (allDocs.some((d) => d.status === "reviewing")) {
    overallStatus = "reviewing";
  }

  // Update kyc_verifications
  await supabase
    .from("kyc_verifications")
    .update({
      status: overallStatus,
      identity_verified: identityVerified,
      address_verified: addressVerified,
      updated_at: new Date().toISOString(),
      ...(allRequiredVerified
        ? { completed_at: new Date().toISOString() }
        : { completed_at: null }),
    })
    .eq("user_id", userId);

  await supabase
    .from("profiles")
    .update({
      is_verified: overallStatus === "verified",
      verification_status: overallStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}
