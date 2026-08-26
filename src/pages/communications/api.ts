import { axiosInstance } from "@/lib/axios";

// Thin wrapper around the /email/* admin endpoints (mounted under the
// obscured /adminurlabdkole admin prefix on the backend — see
// kolekto-be-old/routes/admin/emailCampaigns.js). Grouped here rather than
// inline in each page (the informal convention elsewhere in this repo)
// because this feature has meaningfully more endpoints than any single
// existing admin page.
const BASE = "/adminurlabdkole/email";

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  // A campaign whose recipients all reached a terminal state, but with a
  // mix of delivered and failed. Previously such a campaign reported a flat
  // "sent", which hid partial failures from the admin entirely.
  | "completed_with_errors"
  | "failed"
  | "cancelled";

/**
 * Generates an idempotency key for a single user intent.
 *
 * The key is minted ONCE per intent (one click of Send, one click of Send
 * Test) and reused across every retry of that intent, which is what makes
 * the retry safe: the server recognises the repeat and returns the original
 * outcome instead of performing the action again. Minting a fresh key per
 * HTTP attempt would defeat the entire mechanism.
 */
export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function idempotentConfig(key?: string) {
  return key ? { headers: { "Idempotency-Key": key } } : undefined;
}

/** Per-campaign delivery breakdown, resolved for a whole page in one query. */
export interface CampaignStats {
  total: number;
  queued: number;
  processing: number;
  delivered: number;
  retrying: number;
  failed: number;
}

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
  /** null when the summary lookup degraded — render the audience size alone. */
  stats: CampaignStats | null;
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
  /** People matching the filter. NOT the number attached to the campaign. */
  total: number;
  sample: { id: string; email: string; full_name: string | null }[];
  /** Matches minus suppressed addresses — what would actually be delivered. */
  estimatedDelivery: number;
  eligible: number;
  unsubscribed: number;
  /**
   * True when no audience condition is set at all. Distinct from `total === 0`,
   * which means "a real filter that matches nobody". The old API could not tell
   * these apart: an empty filter returned a count of the entire directory, so
   * the builder displayed 609 recipients for a campaign that had none attached.
   */
  noFilterConfigured: boolean;
}

/**
 * Truthful audience numbers for a saved campaign.
 *
 * `attached` and `eligibleFromFilter` are separate because they overlap — the
 * filter is materialized with an idempotent insert at send time, so someone in
 * both is stored once. `estimatedRecipients` is therefore an upper bound and is
 * labelled as such in the UI rather than presented as an exact count.
 */
export interface CampaignAudienceSummary {
  attached: number;
  filterConfigured: boolean;
  matching: number;
  unsubscribedExcluded: number;
  eligibleFromFilter: number;
  estimatedRecipients: number;
  canSend: boolean;
}

// ── Campaigns ───────────────────────────────────────────────────────────

export async function listCampaigns(params: { status?: string; search?: string; limit?: number; offset?: number }) {
  const { data } = await axiosInstance.get<{ campaigns: EmailCampaignSummary[]; total: number }>(`${BASE}/campaigns`, { params });
  return data;
}

export async function createCampaign(input: CampaignInput, idempotencyKey?: string) {
  const { data } = await axiosInstance.post<{ campaign: EmailCampaign; idempotentReplay?: boolean }>(
    `${BASE}/campaigns`,
    input,
    idempotentConfig(idempotencyKey),
  );
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
  /** The value the server substitutes when rendering a sample preview. */
  sample?: string;
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

/** Server-computed audience state for a saved campaign — backs the summary and send confirmation. */
export async function getAudienceSummary(id: string) {
  const { data } = await axiosInstance.get<CampaignAudienceSummary>(`${BASE}/campaigns/${id}/audience-summary`);
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

export async function sendTestEmail(id: string, testEmails: string[], idempotencyKey?: string) {
  const { data } = await axiosInstance.post<{
    results: { to: string; success: boolean; error?: string }[];
    idempotentReplay?: boolean;
  }>(`${BASE}/campaigns/${id}/test-send`, { testEmails }, idempotentConfig(idempotencyKey));
  return data;
}

export interface SendNowResult {
  campaign: EmailCampaign;
  recipientCount: number;
  /** Set when the campaign was already sending — a duplicate click or a
   * retry of a request that had in fact succeeded. Not an error. */
  alreadyStarted?: boolean;
}

// Starting a campaign now returns as soon as the recipients are queued, but
// resolving a large audience filter still happens inside this request, so it
// is given a longer ceiling than the 15s global default. Under the old
// architecture the whole SEND ran here and routinely blew that 15s — the
// resulting "failed" toast on a campaign that was actually sending is what
// prompted admins to click again.
const SEND_NOW_TIMEOUT_MS = 120_000;

export async function sendCampaignNow(id: string, idempotencyKey?: string) {
  const { data } = await axiosInstance.post<SendNowResult>(
    `${BASE}/campaigns/${id}/send-now`,
    {},
    { ...idempotentConfig(idempotencyKey), timeout: SEND_NOW_TIMEOUT_MS },
  );
  return data;
}

// ── Live progress ───────────────────────────────────────────────────────

export interface CampaignProgress {
  campaignId: string;
  status: CampaignStatus;
  isTerminal: boolean;
  queued: number;
  sending: number;
  delivered: number;
  /** Failed but still has delivery attempts left — in flight, not lost. */
  retrying: number;
  failed: number;
  total: number;
  remaining: number;
  percentComplete: number;
  startedAt: string | null;
  completedAt: string | null;
}

// Aggregate-only, fixed-size response regardless of campaign size, so this
// is safe to poll every few seconds for the whole duration of a send.
export async function getCampaignProgress(id: string) {
  const { data } = await axiosInstance.get<CampaignProgress>(`${BASE}/campaigns/${id}/progress`);
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
