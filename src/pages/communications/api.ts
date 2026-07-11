import { axiosInstance } from "@/lib/axios";

// Thin wrapper around the /email/* admin endpoints (mounted under the
// obscured /adminurlabdkole admin prefix on the backend — see
// kolekto-be-old/routes/admin/emailCampaigns.js). Grouped here rather than
// inline in each page (the informal convention elsewhere in this repo)
// because this feature has meaningfully more endpoints than any single
// existing admin page.
const BASE = "/adminurlabdkole/email";

export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed" | "cancelled";

export interface EmailCampaignSummary {
  id: string;
  name: string;
  status: CampaignStatus;
  subject: string;
  recipient_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  status: CampaignStatus;
  subject: string;
  preview_text: string | null;
  sender_name: string | null;
  reply_to_email: string | null;
  html_body: string;
  footer_html: string | null;
  template_id: string | null;
  filter_json: AudienceFilters | null;
  recipient_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailCampaignRecipient {
  id: string;
  campaign_id: string;
  user_id: string | null;
  email: string;
  status: string;
  queued_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  failed_reason: string | null;
  retry_count: number;
  provider_message_id: string | null;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  preview_text: string | null;
  html_body: string;
  thumbnail_url: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailCampaignAttachment {
  id: string;
  campaign_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

export interface CampaignInput {
  name?: string;
  subject?: string;
  previewText?: string;
  senderName?: string;
  replyToEmail?: string;
  htmlBody?: string;
  footerHtml?: string;
  templateId?: string | null;
  filterJson?: AudienceFilters | null;
}

// Audience filter dimensions actually backed by data (see
// kolekto-be-old/database/email_recipient_directory.sql for provenance).
// country/state/city are NOT included — no such columns exist on
// public.profiles in the live schema.
export interface AudienceFilters {
  registeredAfter?: string;
  registeredBefore?: string;
  isEmailVerified?: boolean;
  isAmbassador?: boolean;
  isOrganizer?: boolean;
  isContributor?: boolean;
  isCollectionCreator?: boolean;
  collectionsCountMin?: number;
  lastLoginAfter?: string;
  lastLoginBefore?: string;
  isReferred?: boolean;
  referralCode?: string;
  // Lets an admin drop specific people out of an otherwise-matching audience.
  excludeEmails?: string[];
}

export interface AudiencePreview {
  total: number;
  sample: { id: string; email: string; full_name: string | null }[];
  estimatedDelivery: number;
}

// ── Campaigns ───────────────────────────────────────────────────────────

export async function listCampaigns(params: { status?: string; search?: string; limit?: number; offset?: number }) {
  const { data } = await axiosInstance.get<{ campaigns: EmailCampaignSummary[]; total: number }>(`${BASE}/campaigns`, { params });
  return data;
}

export async function createCampaign(input: CampaignInput) {
  const { data } = await axiosInstance.post<{ campaign: EmailCampaign }>(`${BASE}/campaigns`, input);
  return data.campaign;
}

export async function getCampaign(id: string) {
  const { data } = await axiosInstance.get<{ campaign: EmailCampaign; recipientStatusCounts: Record<string, number> }>(`${BASE}/campaigns/${id}`);
  return data;
}

export async function updateCampaign(id: string, input: CampaignInput) {
  const { data } = await axiosInstance.patch<{ campaign: EmailCampaign }>(`${BASE}/campaigns/${id}`, input);
  return data.campaign;
}

export async function deleteCampaign(id: string) {
  await axiosInstance.delete(`${BASE}/campaigns/${id}`);
}

export async function previewCampaignHtml(id: string, recipientEmail?: string) {
  const { data } = await axiosInstance.get<{ html: string; subject: string; previewedAs: string | null }>(
    `${BASE}/campaigns/${id}/preview-html`,
    { params: recipientEmail ? { recipientEmail } : undefined },
  );
  return data;
}

// ── Personalization (merge tags) ───────────────────────────────────────

export interface MergeTag {
  key: string;
  label: string;
  category: string;
}

export async function listMergeTags() {
  const { data } = await axiosInstance.get<{ mergeTags: MergeTag[] }>(`${BASE}/merge-tags`);
  return data.mergeTags;
}

export interface RecipientSearchResult {
  id: string;
  email: string;
  full_name: string | null;
}

export async function searchRecipients(q: string) {
  const { data } = await axiosInstance.get<{ recipients: RecipientSearchResult[] }>(`${BASE}/recipients/search`, { params: { q } });
  return data.recipients;
}

// ── Recipients ──────────────────────────────────────────────────────────

export async function addRecipients(id: string, recipients: { email: string; userId?: string }[]) {
  const { data } = await axiosInstance.post<{ added: number; recipientCount: number }>(`${BASE}/campaigns/${id}/recipients`, { recipients });
  return data;
}

export async function listRecipients(id: string, params: { status?: string; limit?: number; offset?: number }) {
  const { data } = await axiosInstance.get<{ recipients: EmailCampaignRecipient[]; total: number }>(`${BASE}/campaigns/${id}/recipients`, { params });
  return data;
}

export async function removeRecipient(campaignId: string, recipientId: string) {
  const { data } = await axiosInstance.delete<{ recipientCount: number }>(`${BASE}/campaigns/${campaignId}/recipients/${recipientId}`);
  return data;
}

export async function previewAudience(id: string, filters: AudienceFilters, pagination?: { limit?: number; offset?: number }) {
  const { data } = await axiosInstance.post<AudiencePreview>(`${BASE}/campaigns/${id}/preview-audience`, {
    filters,
    limit: pagination?.limit,
    offset: pagination?.offset,
  });
  return data;
}

// Downloads the CSV client-side (rather than a plain <a href>) because the
// export endpoint is authenticated via the Bearer token axios attaches on
// every request — a raw anchor link wouldn't carry that header.
export async function downloadAudienceCsv(id: string, filters: AudienceFilters) {
  const response = await axiosInstance.get(`${BASE}/campaigns/${id}/audience/export`, {
    params: { filters: JSON.stringify(filters) },
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = `campaign-${id}-audience.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// ── Send actions ────────────────────────────────────────────────────────

export async function sendTestEmail(id: string, testEmails: string[]) {
  const { data } = await axiosInstance.post<{ results: { to: string; success: boolean; error?: string }[] }>(`${BASE}/campaigns/${id}/test-send`, { testEmails });
  return data.results;
}

export async function sendCampaignNow(id: string) {
  const { data } = await axiosInstance.post<{ campaign: EmailCampaign; recipientCount: number }>(`${BASE}/campaigns/${id}/send-now`);
  return data;
}

export async function cancelCampaign(id: string) {
  const { data } = await axiosInstance.post<{ campaign: EmailCampaign }>(`${BASE}/campaigns/${id}/cancel`);
  return data.campaign;
}

export async function scheduleCampaign(id: string, scheduledAt: string) {
  const { data } = await axiosInstance.post<{ campaign: EmailCampaign }>(`${BASE}/campaigns/${id}/schedule`, { scheduledAt });
  return data.campaign;
}

// ── Attachments ─────────────────────────────────────────────────────────

export async function listAttachments(campaignId: string) {
  const { data } = await axiosInstance.get<{ attachments: EmailCampaignAttachment[] }>(`${BASE}/campaigns/${campaignId}/attachments`);
  return data.attachments;
}

export async function uploadAttachment(campaignId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await axiosInstance.post<{ attachment: EmailCampaignAttachment }>(`${BASE}/campaigns/${campaignId}/attachments`, formData);
  return data.attachment;
}

export async function deleteAttachment(attachmentId: string) {
  await axiosInstance.delete(`${BASE}/attachments/${attachmentId}`);
}

// ── Templates ───────────────────────────────────────────────────────────

export async function listTemplates(category?: string) {
  const { data } = await axiosInstance.get<{ templates: EmailTemplate[] }>(`${BASE}/templates`, { params: category ? { category } : undefined });
  return data.templates;
}

export async function createTemplate(input: { name: string; category?: string; subject?: string; previewText?: string; htmlBody?: string }) {
  const { data } = await axiosInstance.post<{ template: EmailTemplate }>(`${BASE}/templates`, input);
  return data.template;
}

export async function updateTemplate(id: string, input: Partial<{ name: string; category: string; subject: string; previewText: string; htmlBody: string }>) {
  const { data } = await axiosInstance.patch<{ template: EmailTemplate }>(`${BASE}/templates/${id}`, input);
  return data.template;
}

// ── Logs & Analytics ────────────────────────────────────────────────────

export interface EmailLogEntry extends EmailCampaignRecipient {
  email_campaigns: { id: string; name: string; subject: string } | null;
}

export async function listEmailLogs(params: { status?: string; campaignId?: string; search?: string; limit?: number; offset?: number }) {
  const { data } = await axiosInstance.get<{ logs: EmailLogEntry[]; total: number }>(`${BASE}/logs`, { params });
  return data;
}

export interface EmailAnalytics {
  totals: { total: number; sent: number; delivered: number; opened: number; clicked: number; failed: number; bounced: number };
  rates: { openRate: number; clickThroughRate: number; bounceRate: number };
  trend: { date: string; sent: number; opened: number; clicked: number }[];
}

export async function getEmailAnalytics(params: { days?: number; campaignId?: string }) {
  const { data } = await axiosInstance.get<EmailAnalytics>(`${BASE}/analytics`, { params });
  return data;
}

export async function deleteTemplate(id: string) {
  await axiosInstance.delete(`${BASE}/templates/${id}`);
}
