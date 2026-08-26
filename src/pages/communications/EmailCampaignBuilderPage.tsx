import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Save, Eye, Send, SendHorizonal, XCircle, Paperclip, Users, ArrowLeft, Download, Filter, ListPlus, X, ChevronLeft, ChevronRight, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { sanitizeCampaignHtml, sanitizePreviewDocument } from "@/lib/sanitizeHtml";
import { isFullHtmlDocument } from "@/lib/emailHtml";
import { RichTextEditor } from "@/components/email/RichTextEditor";
import { FileUpload, FileListItem } from "@/components/email/FileUpload";
import { AudienceFilterBuilder } from "@/components/email/AudienceFilterBuilder";
import {
  getCampaign,
  createCampaign,
  updateCampaign,
  previewCampaignHtml,
  addRecipients,
  listRecipients,
  removeRecipient,
  sendTestEmail,
  sendCampaignNow,
  scheduleCampaign,
  cancelCampaign,
  listAttachments,
  uploadAttachment,
  deleteAttachment,
  listTemplates,
  previewAudience,
  getAudienceSummary,
  downloadAudienceCsv,
  searchRecipients,
  getCampaignProgress,
  newIdempotencyKey,
  type CampaignProgress,
  type EmailCampaign,
  type EmailCampaignRecipient,
  type EmailCampaignAttachment,
  type EmailTemplate,
  type AudienceFilters,
  type AudiencePreview,
  type CampaignAudienceSummary,
  type RecipientSearchResult,
} from "./api";

const STATUS_STYLES: Record<string, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  scheduled: "border-blue-200 bg-blue-50 text-blue-700",
  sending: "border-amber-200 bg-amber-50 text-amber-700",
  sent: "border-green-200 bg-green-50 text-green-700",
  // Finished, but not cleanly — amber rather than green so a partially
  // failed campaign cannot be mistaken for a fully delivered one at a glance.
  completed_with_errors: "border-amber-300 bg-amber-50 text-amber-800",
  failed: "border-red-200 bg-red-50 text-red-700",
  cancelled: "border-slate-200 bg-slate-100 text-slate-500",
};

const STATUS_LABELS: Record<string, string> = {
  completed_with_errors: "Completed with errors",
};

export function campaignStatusLabel(status: string) {
  return STATUS_LABELS[status] || status;
}

export default function EmailCampaignBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<EmailCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [senderName, setSenderName] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [footerHtml, setFooterHtml] = useState("");

  // Templates
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // Recipients
  const [recipients, setRecipients] = useState<EmailCampaignRecipient[]>([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [recipientDraft, setRecipientDraft] = useState("");
  const [addingRecipients, setAddingRecipients] = useState(false);
  const [removingRecipientId, setRemovingRecipientId] = useState<string | null>(null);
  const [recipientMode, setRecipientMode] = useState<"list" | "filter">("list");
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [liveProgress, setLiveProgress] = useState<CampaignProgress | null>(null);

  // Search-driven multi-select picker for "Explicit list" mode. Selections
  // accumulate in `selectedPicks` across searches (typing a new query never
  // clears it) and are mirrored to localStorage so they survive a page
  // reload/reopen too — up until they're actually committed via
  // handleAddSelectedPicks, at which point they're persisted server-side as
  // real recipient rows instead.
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerResults, setPickerResults] = useState<RecipientSearchResult[]>([]);
  const [pickerSearching, setPickerSearching] = useState(false);
  const [selectedPicks, setSelectedPicks] = useState<Map<string, RecipientSearchResult>>(new Map());
  const [showPasteBox, setShowPasteBox] = useState(false);

  const [audienceFilters, setAudienceFilters] = useState<AudienceFilters>({});
  const [audiencePreview, setAudiencePreview] = useState<AudiencePreview | null>(null);
  const [audiencePreviewLoading, setAudiencePreviewLoading] = useState(false);
  const [audiencePage, setAudiencePage] = useState(0);
  // Server-computed truth about this campaign's audience: how many recipients
  // are actually attached vs how many a saved filter would resolve to.
  //
  // This is deliberately NOT derived from the live preview. The preview answers
  // "who matches the filter I am currently typing"; it says nothing about what
  // is stored against the campaign. Conflating the two is what previously let
  // the page display 609 recipients for a campaign with none attached, and then
  // hand the admin "Campaign has no recipients" on send.
  const [audienceSummary, setAudienceSummary] = useState<CampaignAudienceSummary | null>(null);
  const [savingFilter, setSavingFilter] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const AUDIENCE_PAGE_SIZE = 10;

  // Attachments
  const [attachments, setAttachments] = useState<EmailCampaignAttachment[]>([]);

  // Preview / test / send
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewRecipientEmail, setPreviewRecipientEmail] = useState<string | null>(null);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientResults, setRecipientResults] = useState<RecipientSearchResult[]>([]);
  const [recipientSearchOpen, setRecipientSearchOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [testEmails, setTestEmails] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [sendNowOpen, setSendNowOpen] = useState(false);
  const [sendingNow, setSendingNow] = useState(false);

  // Fine-grained UI phases so the admin always knows which step is running,
  // instead of a single spinner that could mean anything.
  const [sendPhase, setSendPhase] = useState<"idle" | "saving" | "starting" | "started" | "failed">("idle");
  const [testSendState, setTestSendState] = useState<"idle" | "saving" | "sending" | "sent" | "failed">("idle");

  // Synchronous re-entrancy guards. React state is the wrong tool for this:
  // setSendingNow(true) does not take effect until the next render, so two
  // clicks in the same tick both observe the old value and both fire. Refs
  // update immediately. This is the client half of duplicate protection —
  // the authoritative half is the server's idempotency key.
  const sendingNowRef = useRef(false);
  const sendingTestRef = useRef(false);
  const creatingRef = useRef(false);
  const createKeyRef = useRef<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleValue, setScheduleValue] = useState("");
  const [scheduling, setScheduling] = useState(false);

  const isNew = id === "new";
  const isEditable = !campaign || campaign.status === "draft" || campaign.status === "scheduled";

  const applyCampaign = useCallback((c: EmailCampaign) => {
    setCampaign(c);
    setName(c.name);
    setSubject(c.subject || "");
    setPreviewText(c.preview_text || "");
    setSenderName(c.sender_name || "");
    setReplyToEmail(c.reply_to_email || "");
    setHtmlBody(c.html_body || "");
    setFooterHtml(c.footer_html || "");
    setRecipientCount(c.recipient_count || 0);
    if (c.filter_json && Object.keys(c.filter_json).length > 0) {
      setAudienceFilters(c.filter_json);
      setRecipientMode("filter");
    }
  }, []);

  useEffect(() => {
    listTemplates().then(setTemplates).catch(() => {});
  }, []);

  // Resetting the page whenever the filter conditions change (but not when
  // only the page itself changes) keeps "page 3" from silently pointing at
  // a now-irrelevant slice after the admin tweaks a filter.
  useEffect(() => {
    setAudiencePage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    audienceFilters.registeredAfter,
    audienceFilters.registeredBefore,
    audienceFilters.isEmailVerified,
    audienceFilters.isAmbassador,
    audienceFilters.isOrganizer,
    audienceFilters.isContributor,
    audienceFilters.isCollectionCreator,
    audienceFilters.collectionsCountMin,
    audienceFilters.lastLoginAfter,
    audienceFilters.lastLoginBefore,
    audienceFilters.isReferred,
    audienceFilters.referralCode,
  ]);

  // Debounced live audience count + current page of matches while the
  // admin adjusts filters or excludes individuals.
  useEffect(() => {
    if (!id || isNew || recipientMode !== "filter") return;
    const handle = setTimeout(async () => {
      setAudiencePreviewLoading(true);
      try {
        const result = await previewAudience(id, audienceFilters, { limit: AUDIENCE_PAGE_SIZE, offset: audiencePage * AUDIENCE_PAGE_SIZE });
        setAudiencePreview(result);
      } catch {
        setAudiencePreview(null);
      } finally {
        setAudiencePreviewLoading(false);
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [id, isNew, recipientMode, audienceFilters, audiencePage]);

  function excludeFromAudience(email: string) {
    setAudienceFilters((prev) => {
      const current = prev.excludeEmails || [];
      if (current.includes(email)) return prev;
      return { ...prev, excludeEmails: [...current, email] };
    });
  }

  function includeBackInAudience(email: string) {
    setAudienceFilters((prev) => ({
      ...prev,
      excludeEmails: (prev.excludeEmails || []).filter((e) => e !== email),
    }));
  }

  useEffect(() => {
    if (!id) return;

    if (isNew) {
      // This effect can run twice for one navigation — React 18 StrictMode
      // double-invokes effects in development, and a fast re-render can
      // re-enter it. Each run used to POST a new campaign, so simply opening
      // the builder could leave two "Untitled Campaign" drafts behind.
      //
      // Two independent protections, because they cover different cases:
      //   - the ref stops a second run within this mounted component;
      //   - the idempotency key, minted once and held in the ref, makes the
      //     server collapse any duplicate that still gets through (a retry,
      //     a remount, a lost response) onto the same campaign row.
      if (creatingRef.current) return;
      creatingRef.current = true;
      if (!createKeyRef.current) createKeyRef.current = newIdempotencyKey();

      (async () => {
        try {
          const created = await createCampaign({ name: "Untitled Campaign" }, createKeyRef.current!);
          navigate(`/communications/campaigns/${created.id}`, { replace: true });
        } catch (error: any) {
          creatingRef.current = false;
          toast.error(error?.response?.data?.error || "Failed to create campaign");
          navigate("/communications/campaigns");
        }
      })();
      return;
    }

    setLoading(true);
    Promise.all([getCampaign(id), listRecipients(id, { limit: 50 }), listAttachments(id)])
      .then(([{ campaign, recipientStatusCounts }, { recipients }, attachments]) => {
        applyCampaign(campaign);
        setStatusCounts(recipientStatusCounts || {});
        setRecipients(recipients);
        setAttachments(attachments);
      })
      .catch((error: any) => {
        toast.error(error?.response?.data?.error || "Failed to load campaign");
      })
      .finally(() => setLoading(false));
  }, [id, isNew, navigate, applyCampaign]);

  const refreshRecipients = useCallback(async () => {
    if (!id || isNew) return;
    const { recipients } = await listRecipients(id, { limit: 50 });
    setRecipients(recipients);
  }, [id, isNew]);

  // Live send progress. Polls the dedicated aggregate endpoint rather than
  // re-fetching the whole campaign: its response is a fixed set of counters
  // regardless of campaign size, so polling a 10,000-recipient send every few
  // seconds costs the same as polling a 10-recipient one.
  //
  // Polling starts as soon as the campaign is sending AND keeps running for
  // one final tick after it finishes, so the admin sees the completed totals
  // rather than the last in-flight snapshot.
  useEffect(() => {
    if (!id || isNew) return;
    if (campaign?.status !== "sending") return;
    let cancelled = false;

    const poll = async () => {
      try {
        const next = await getCampaignProgress(id);
        if (cancelled) return;
        setLiveProgress(next);
        // The campaign row itself only needs re-reading when the send ends.
        if (next.isTerminal) {
          const { campaign: refreshed } = await getCampaign(id);
          if (!cancelled) setCampaign(refreshed);
        }
      } catch {
        // Transient polling error — the next tick retries. Deliberately not
        // surfaced as a toast: a blip in a background poller is not
        // something the admin needs to act on, and a repeating error toast
        // during a long send is worse than the blip.
      }
    };

    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id, isNew, campaign?.status]);

  const progress = useMemo(() => {
    // Prefer live poll data; fall back to the status counts loaded with the
    // page so the panel renders immediately instead of showing zeros for the
    // first four seconds.
    if (liveProgress) {
      const resolved = liveProgress.delivered + liveProgress.failed;
      return {
        queued: liveProgress.queued,
        sending: liveProgress.sending,
        delivered: liveProgress.delivered,
        retrying: liveProgress.retrying,
        failed: liveProgress.failed,
        total: liveProgress.total,
        resolved,
        pct: liveProgress.percentComplete,
      };
    }
    const queued = statusCounts.pending || 0;
    const sending = statusCounts.processing || 0;
    const delivered = (statusCounts.sent || 0) + (statusCounts.delivered || 0) + (statusCounts.opened || 0) + (statusCounts.clicked || 0);
    const failed = statusCounts.failed || 0;
    const total = recipientCount || queued + sending + delivered + failed;
    const resolved = delivered + failed;
    const pct = total > 0 ? Math.round((resolved / total) * 100) : 0;
    return { queued, sending, delivered, retrying: 0, failed, total, resolved, pct };
  }, [liveProgress, statusCounts, recipientCount]);

  // Restore an in-progress (not-yet-added) selection cart on mount, so
  // navigating away or reloading the page mid-search doesn't lose it.
  useEffect(() => {
    if (!id || isNew) return;
    try {
      const raw = localStorage.getItem(`email-campaign-picker-cart:${id}`);
      if (!raw) return;
      const parsed: RecipientSearchResult[] = JSON.parse(raw);
      setSelectedPicks(new Map(parsed.map((r) => [r.email.toLowerCase(), r])));
    } catch {
      // malformed or unavailable storage — start with an empty cart
    }
  }, [id, isNew]);

  useEffect(() => {
    if (!id || isNew) return;
    try {
      localStorage.setItem(`email-campaign-picker-cart:${id}`, JSON.stringify(Array.from(selectedPicks.values())));
    } catch {
      // storage unavailable (private mode, quota) — cart just won't survive a reload
    }
  }, [id, isNew, selectedPicks]);

  const existingRecipientEmails = useMemo(() => new Set(recipients.map((r) => r.email.toLowerCase())), [recipients]);

  // Debounced search for the "Explicit list" multi-select picker.
  useEffect(() => {
    if (!pickerQuery || pickerQuery.length < 2) {
      setPickerResults([]);
      return;
    }
    setPickerSearching(true);
    const handle = setTimeout(async () => {
      try {
        setPickerResults(await searchRecipients(pickerQuery));
      } catch {
        setPickerResults([]);
      } finally {
        setPickerSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [pickerQuery]);

  function togglePick(r: RecipientSearchResult) {
    setSelectedPicks((prev) => {
      const next = new Map(prev);
      const key = r.email.toLowerCase();
      if (next.has(key)) next.delete(key);
      else next.set(key, r);
      return next;
    });
  }

  function selectAllShown() {
    setSelectedPicks((prev) => {
      const next = new Map(prev);
      for (const r of pickerResults) {
        if (!existingRecipientEmails.has(r.email.toLowerCase())) next.set(r.email.toLowerCase(), r);
      }
      return next;
    });
  }

  function removePick(key: string) {
    setSelectedPicks((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }

  async function handleAddSelectedPicks() {
    if (!id || selectedPicks.size === 0) return;
    setAddingRecipients(true);
    try {
      const toAdd = Array.from(selectedPicks.values()).map((r) => ({ email: r.email, userId: r.id }));
      const { recipientCount } = await addRecipients(id, toAdd);
      setRecipientCount(recipientCount);
      setSelectedPicks(new Map());
      await refreshRecipients();
      void refreshAudienceSummary();
      toast.success(`Added ${toAdd.length} recipient${toAdd.length !== 1 ? "s" : ""}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to add recipients");
    } finally {
      setAddingRecipients(false);
    }
  }

  async function handleSave(showToast = true) {
    if (!id || isNew) return null;
    setSaving(true);
    try {
      const updated = await updateCampaign(id, {
        name,
        subject,
        previewText,
        senderName,
        replyToEmail,
        htmlBody,
        footerHtml,
      });
      setCampaign(updated);
      if (showToast) toast.success("Draft saved");
      return updated;
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to save campaign");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleApplyTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setSubject(template.subject || subject);
    setPreviewText(template.preview_text || previewText);
    setHtmlBody(template.html_body || htmlBody);
  }

  async function handlePreview() {
    if (!id) return;
    const saved = await handleSave(false);
    if (!saved) return;
    setPreviewOpen(true);
    await loadPreview(previewRecipientEmail || undefined);
  }

  async function loadPreview(recipientEmail?: string) {
    if (!id) return;
    setPreviewLoading(true);
    try {
      const result = await previewCampaignHtml(id, recipientEmail);
      setPreviewHtml(result.html);
      setPreviewSubject(result.subject);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to render preview");
    } finally {
      setPreviewLoading(false);
    }
  }

  function handleSelectPreviewRecipient(recipient: RecipientSearchResult | null) {
    setPreviewRecipientEmail(recipient?.email || null);
    setRecipientQuery(recipient ? recipient.email : "");
    setRecipientSearchOpen(false);
    loadPreview(recipient?.email);
  }

  // Debounced recipient search for "Preview As Recipient".
  useEffect(() => {
    if (!recipientQuery || recipientQuery.length < 2 || recipientQuery === previewRecipientEmail) {
      setRecipientResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        setRecipientResults(await searchRecipients(recipientQuery));
      } catch {
        setRecipientResults([]);
      }
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientQuery]);

  async function handleAddRecipients() {
    if (!id) return;
    const emails = recipientDraft
      .split(/[\n,]/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (emails.length === 0) {
      toast.error("Enter at least one email address");
      return;
    }
    setAddingRecipients(true);
    try {
      const { recipientCount } = await addRecipients(id, emails.map((email) => ({ email })));
      setRecipientCount(recipientCount);
      setRecipientDraft("");
      await refreshRecipients();
      void refreshAudienceSummary();
      toast.success(`Added ${emails.length} recipient${emails.length !== 1 ? "s" : ""}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to add recipients");
    } finally {
      setAddingRecipients(false);
    }
  }

  async function handleRemoveRecipient(recipientId: string) {
    if (!id) return;
    setRemovingRecipientId(recipientId);
    try {
      const { recipientCount } = await removeRecipient(id, recipientId);
      setRecipientCount(recipientCount);
      setRecipients((prev) => prev.filter((r) => r.id !== recipientId));
      void refreshAudienceSummary();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to remove recipient");
    } finally {
      setRemovingRecipientId(null);
    }
  }

  /** Re-read the server's view of the audience. Call after anything that changes it. */
  const refreshAudienceSummary = useCallback(async () => {
    if (!id || isNew) return;
    try {
      setAudienceSummary(await getAudienceSummary(id));
    } catch {
      // Non-fatal: the summary is a display aid. The send endpoint performs its
      // own authoritative check, so a failed refresh degrades the labels rather
      // than letting anything unsafe through.
      setAudienceSummary(null);
    }
  }, [id, isNew]);

  useEffect(() => {
    void refreshAudienceSummary();
  }, [refreshAudienceSummary]);

  // Does the audience builder currently describe an actual audience?
  // An object with no conditions is "nothing configured", never "everyone" —
  // the same rule the backend enforces, checked here only so the UI can explain
  // the problem before the request rather than after it.
  const hasAudienceConditions =
    Object.entries(audienceFilters).some(([key, value]) => {
      if (key === "excludeEmails") return Array.isArray(value) && value.length > 0;
      return value !== undefined && value !== null && value !== "";
    });

  async function handleSaveAudienceFilter() {
    if (!id) return;

    // Refuse locally with the same rule the API applies, so the admin gets an
    // immediate, specific explanation instead of a round-trip and a generic
    // failure toast. Previously this saved `{}` and reported success, which is
    // what made an unconfigured audience look like a configured one.
    if (!hasAudienceConditions) {
      toast.error("No audience configured. Add at least one audience condition before saving.");
      return;
    }

    setSavingFilter(true);
    try {
      const updated = await updateCampaign(id, { filterJson: audienceFilters });
      setCampaign(updated);
      await refreshAudienceSummary();
      toast.success("Audience filter saved — it will be applied when you send this campaign");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to save audience filter");
    } finally {
      setSavingFilter(false);
    }
  }

  async function handleExportCsv() {
    if (!id) return;
    setExportingCsv(true);
    try {
      await downloadAudienceCsv(id, audienceFilters);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to export audience");
    } finally {
      setExportingCsv(false);
    }
  }

  async function handleSendTest() {
    if (!id) return;
    // Re-entrancy guard read from the ref, not from React state: state
    // updates are asynchronous, so a second click landing in the same tick
    // as the first would still see sendingTest === false. The ref flips
    // synchronously, which is what actually makes a rapid double-click a
    // single request.
    if (sendingTestRef.current) return;

    const emails = testEmails.split(/[\n,]/).map((e) => e.trim()).filter(Boolean);
    if (emails.length === 0) {
      toast.error("Enter at least one test email address");
      return;
    }

    // Claim the button BEFORE the first await. The old ordering awaited
    // handleSave() first and only then set the flag, leaving the button live
    // for the whole save round-trip — the exact window an impatient admin
    // clicks through.
    sendingTestRef.current = true;
    setSendingTest(true);
    setTestSendState("saving");

    // One key per intent, reused across retries of that intent.
    const idempotencyKey = newIdempotencyKey();

    try {
      const saved = await handleSave(false);
      if (!saved) {
        setTestSendState("idle");
        return;
      }

      setTestSendState("sending");
      const { results, idempotentReplay } = await sendTestEmail(id, emails, idempotencyKey);
      const failed = results.filter((r) => !r.success);

      if (failed.length === 0) {
        setTestSendState("sent");
        toast.success(idempotentReplay ? "Test email already sent for this request" : "Test email sent");
      } else {
        setTestSendState("failed");
        toast.error(`Failed for: ${failed.map((f) => f.to).join(", ")}`);
      }
    } catch (error: any) {
      setTestSendState("failed");
      toast.error(error?.response?.data?.error || "Failed to send test email");
    } finally {
      sendingTestRef.current = false;
      setSendingTest(false);
    }
  }

  async function handleSendNow() {
    if (!id) return;
    if (sendingNowRef.current) return; // synchronous double-click guard

    sendingNowRef.current = true;
    setSendingNow(true);
    setSendPhase("saving");

    const idempotencyKey = newIdempotencyKey();

    try {
      const saved = await handleSave(false);
      if (!saved) {
        setSendPhase("idle");
        return;
      }

      setSendPhase("starting");
      const result = await sendCampaignNow(id, idempotencyKey);

      // alreadyStarted is a success, not a failure: it means this exact
      // campaign was already sending — a duplicate click, or a retry of a
      // request that had in fact succeeded. Reporting it as an error is what
      // used to make admins click again and doubt whether anything happened.
      toast.success(
        result.alreadyStarted
          ? "This campaign is already sending"
          : `Campaign started — ${result.recipientCount.toLocaleString()} recipient${result.recipientCount !== 1 ? "s" : ""} queued`,
      );

      setSendPhase("started");
      applyCampaign(result.campaign);
      setSendNowOpen(false);
      // Seed the progress panel immediately so the admin sees the campaign
      // moving rather than an empty screen while the first poll is pending.
      getCampaignProgress(id).then(setLiveProgress).catch(() => {});
    } catch (error: any) {
      setSendPhase("failed");
      toast.error(
        error?.response?.data?.error || "Campaign could not be started. Please try again.",
      );
    } finally {
      sendingNowRef.current = false;
      setSendingNow(false);
    }
  }

  async function handleSchedule() {
    if (!id || !scheduleValue) return;
    const saved = await handleSave(false);
    if (!saved) return;
    setScheduling(true);
    try {
      const updated = await scheduleCampaign(id, new Date(scheduleValue).toISOString());
      applyCampaign(updated);
      toast.success("Campaign scheduled");
      setScheduleOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to schedule campaign");
    } finally {
      setScheduling(false);
    }
  }

  async function handleCancel() {
    if (!id) return;
    setCancelling(true);
    try {
      const updated = await cancelCampaign(id);
      applyCampaign(updated);
      toast.success("Campaign cancelled");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to cancel campaign");
    } finally {
      setCancelling(false);
    }
  }

  async function handleUploadAttachment(file: File) {
    if (!id) throw new Error("Save the campaign before adding attachments");
    const attachment = await uploadAttachment(id, file);
    setAttachments((prev) => [...prev, attachment]);
    return { url: attachment.file_url, name: attachment.file_name };
  }

  const uploadImage = useMemo(() => (id && !isNew ? handleUploadAttachment : undefined), [id, isNew]);

  async function handleDeleteAttachment(attachmentId: string) {
    try {
      await deleteAttachment(attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to remove attachment");
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // WHO WILL ACTUALLY RECEIVE THIS CAMPAIGN
  //
  // This used to be:
  //
  //   recipientMode === "filter" ? (audiencePreview?.total ?? 0) : recipientCount
  //
  // i.e. in filter mode the page reported the LIVE PREVIEW total as though it
  // were the campaign's recipients. Because an unconfigured filter matched the
  // whole directory, the tab read "Recipients (609)" and Send was enabled for a
  // campaign with zero recipients attached and no audience saved.
  //
  // Everything below now comes from the server's audience summary, which counts
  // attached rows and resolves the SAVED filter — never the in-progress one.
  const attachedRecipients = audienceSummary?.attached ?? recipientCount;
  const eligibleFromFilter = audienceSummary?.eligibleFromFilter ?? 0;
  const unsubscribedExcluded = audienceSummary?.unsubscribedExcluded ?? 0;
  const filterConfigured = audienceSummary?.filterConfigured ?? false;

  // Upper bound: a person who is both attached and a filter match is inserted
  // once at send time, so these two can overlap. Shown as "up to" in the UI.
  const estimatedRecipients = audienceSummary?.estimatedRecipients ?? attachedRecipients;

  // Sending requires the server to have found something real to send to.
  // While the summary is still loading we fall back to the attached count,
  // which is never an over-estimate.
  const canSend = audienceSummary ? audienceSummary.canSend : attachedRecipients > 0;

  const sendBlockedReason = canSend
    ? null
    : filterConfigured
      ? unsubscribedExcluded > 0
        ? "Every recipient matching the saved audience has unsubscribed."
        : "The saved audience filter currently matches nobody."
      : "No eligible recipients. Configure an audience before sending this campaign.";

  if (loading || isNew) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-kolekto-orange" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 gap-1 text-muted-foreground" onClick={() => navigate("/communications/campaigns")}>
            <ArrowLeft className="h-4 w-4" /> Back to campaigns
          </Button>
          <div className="flex items-center gap-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isEditable}
              className="h-9 w-72 border-none px-0 text-2xl font-bold tracking-tight shadow-none focus-visible:ring-0"
            />
            {campaign && (
              <Badge variant="outline" className={STATUS_STYLES[campaign.status]}>
                {campaign.status}
              </Badge>
            )}
          </div>
          {campaign?.status === "scheduled" && campaign.scheduled_at && (
            <p className="mt-1 text-sm text-muted-foreground">Scheduled for {new Date(campaign.scheduled_at).toLocaleString()}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {isEditable && (
            <>
              <Button variant="outline" onClick={() => handleSave()} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Draft
              </Button>
              <Button variant="outline" onClick={handlePreview} className="gap-2">
                <Eye className="h-4 w-4" /> Preview
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (campaign?.status === "scheduled" && campaign.scheduled_at) {
                    const local = new Date(campaign.scheduled_at);
                    setScheduleValue(new Date(local.getTime() - local.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                  }
                  setScheduleOpen(true);
                }}
                disabled={!canSend}
                title={sendBlockedReason ?? undefined}
                className="gap-2"
              >
                <CalendarClock className="h-4 w-4" /> {campaign?.status === "scheduled" ? "Reschedule" : "Schedule"}
              </Button>
              <Button
                className="gap-2 bg-kolekto-orange text-white hover:bg-kolekto-orange/90"
                onClick={() => setSendNowOpen(true)}
                disabled={!canSend}
                title={sendBlockedReason ?? undefined}
              >
                <SendHorizonal className="h-4 w-4" /> Send Now
              </Button>
            </>
          )}
          {campaign && ["scheduled", "sending"].includes(campaign.status) && (
            <Button variant="outline" onClick={handleCancel} disabled={cancelling} className="gap-2 text-destructive">
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Cancel
            </Button>
          )}
        </div>
      </div>

      {campaign?.status === "sending" && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium text-amber-800">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending — {progress.pct}% resolved
              </span>
              <span className="text-muted-foreground">
                {progress.resolved} of {progress.total}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-amber-100">
              <div className="h-full bg-kolekto-orange transition-all" style={{ width: `${progress.pct}%` }} />
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>
                Queued: <b className="text-slate-950">{progress.queued}</b>
              </span>
              <span>
                Sending: <b className="text-slate-950">{progress.sending}</b>
              </span>
              <span>
                Delivered: <b className="text-green-700">{progress.delivered}</b>
              </span>
              {/* Reported separately from Failed: these still have delivery
                  attempts left and are waiting out a backoff, so they are in
                  flight, not lost. Folding them into "Failed" made a healthy
                  send look like it was failing. */}
              <span>
                Retrying: <b className="text-amber-700">{progress.retrying}</b>
              </span>
              <span>
                Failed: <b className="text-red-700">{progress.failed}</b>
              </span>
              <span>
                Remaining: <b className="text-slate-950">{progress.queued + progress.sending + progress.retrying}</b>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {campaign && ["sent", "completed_with_errors", "failed"].includes(campaign.status) && progress.total > 0 && (
        <Card
          className={cn(
            campaign.status === "sent" && "border-green-200 bg-green-50/60",
            campaign.status === "completed_with_errors" && "border-amber-200 bg-amber-50/60",
            campaign.status === "failed" && "border-red-200 bg-red-50/60",
          )}
        >
          <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm">
            <span className="font-medium">
              {campaign.status === "sent"
                ? "Campaign completed."
                : campaign.status === "completed_with_errors"
                ? "Campaign completed with errors."
                : "Campaign failed."}
            </span>
            <span className="text-muted-foreground">
              <b className="text-green-700">{progress.delivered.toLocaleString()}</b> sent
            </span>
            <span className="text-muted-foreground">
              <b className="text-red-700">{progress.failed.toLocaleString()}</b> failed
            </span>
            <span className="text-muted-foreground">of {progress.total.toLocaleString()} total</span>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="recipients" className="gap-1">
            {/* Attached recipients — the stored truth, not the live filter preview. */}
            <Users className="h-3.5 w-3.5" /> Recipients ({attachedRecipients})
          </TabsTrigger>
          <TabsTrigger value="attachments" className="gap-1">
            <Paperclip className="h-3.5 w-3.5" /> Attachments ({attachments.length})
          </TabsTrigger>
          <TabsTrigger value="test">Test &amp; Send</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Subject</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!isEditable} placeholder="Email subject line" />
                </div>
                <div className="space-y-1.5">
                  <Label>Preview text</Label>
                  <Input value={previewText} onChange={(e) => setPreviewText(e.target.value)} disabled={!isEditable} placeholder="Shown next to the subject in most inboxes" />
                </div>
                <div className="space-y-1.5">
                  <Label>Sender name</Label>
                  <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} disabled={!isEditable} placeholder="Kolekto" />
                </div>
                <div className="space-y-1.5">
                  <Label>Reply-to email</Label>
                  <Input value={replyToEmail} onChange={(e) => setReplyToEmail(e.target.value)} disabled={!isEditable} placeholder="support@kolekto.com.ng" />
                </div>
              </div>

              {templates.length > 0 && isEditable && (
                <div className="flex items-center gap-2">
                  <Label className="shrink-0">Start from a template</Label>
                  <Select value={selectedTemplateId} onValueChange={handleApplyTemplate}>
                    <SelectTrigger className="w-72">
                      <SelectValue placeholder="Choose a template…" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Email body</Label>
                {isEditable ? (
                  <RichTextEditor value={htmlBody} onChange={setHtmlBody} onUploadImage={uploadImage} />
                ) : isFullHtmlDocument(htmlBody) ? (
                  // A full email document is rendered in a sandboxed frame,
                  // never inline: it carries its own <style> block (which
                  // would leak into the admin's stylesheet) and its own links
                  // (which, rendered inline, navigate the admin SPA — that is
                  // what produced GET /email/campaigns/kolekto.com.ng 500s).
                  <iframe
                    title="Email body"
                    srcDoc={htmlBody}
                    sandbox=""
                    className="h-[420px] w-full rounded-md border bg-white"
                  />
                ) : (
                  // Sanitized: this renders admin-authored HTML into the
                  // admin's own DOM, so it is a real XSS sink. Styled with the
                  // same class as the editor (not Tailwind `prose`) so the
                  // read-only view matches both the editor and the delivered
                  // email.
                  <div
                    className="kolekto-email-editor rounded-md border p-4"
                    dangerouslySetInnerHTML={{ __html: sanitizeCampaignHtml(htmlBody) }}
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Custom footer (optional HTML — leave blank for the default Kolekto footer)</Label>
                <Textarea value={footerHtml} onChange={(e) => setFooterHtml(e.target.value)} disabled={!isEditable} className="font-mono text-xs" rows={4} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recipients" className="space-y-4">
          {/* Server-computed audience state. Separates "attached to this
              campaign" from "matches the saved filter" so the page can never
              again present a directory-wide preview count as this campaign's
              recipients. Every figure comes from /audience-summary. */}
          {audienceSummary && (
            <div
              className={cn(
                "rounded-md border p-3 text-sm",
                canSend ? "bg-muted/30" : "border-amber-300 bg-amber-50",
              )}
            >
              <div className="mb-1.5 font-medium">Audience</div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
                <span>
                  <span className="font-semibold text-foreground">{attachedRecipients.toLocaleString()}</span> attached
                </span>
                {filterConfigured ? (
                  <span>
                    <span className="font-semibold text-foreground">{eligibleFromFilter.toLocaleString()}</span> eligible from filter
                  </span>
                ) : (
                  <span>No audience filter configured</span>
                )}
                {unsubscribedExcluded > 0 && (
                  <span>
                    <span className="font-semibold text-foreground">{unsubscribedExcluded.toLocaleString()}</span> unsubscribed
                  </span>
                )}
              </div>
              {sendBlockedReason && (
                <p className="mt-2 border-t border-amber-200 pt-2 text-amber-800">{sendBlockedReason}</p>
              )}
            </div>
          )}

          {isEditable && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={recipientMode === "list" ? "default" : "outline"}
                className={cn("gap-2", recipientMode === "list" && "bg-kolekto-orange text-white hover:bg-kolekto-orange/90")}
                onClick={() => setRecipientMode("list")}
              >
                <ListPlus className="h-3.5 w-3.5" /> Explicit list
              </Button>
              <Button
                size="sm"
                variant={recipientMode === "filter" ? "default" : "outline"}
                className={cn("gap-2", recipientMode === "filter" && "bg-kolekto-orange text-white hover:bg-kolekto-orange/90")}
                onClick={() => setRecipientMode("filter")}
              >
                <Filter className="h-3.5 w-3.5" /> Audience filter
              </Button>
            </div>
          )}

          {recipientMode === "list" ? (
            <Card>
              <CardContent className="space-y-4 p-4">
                {isEditable && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Search people to add</Label>
                      <Input value={pickerQuery} onChange={(e) => setPickerQuery(e.target.value)} placeholder="Search by name or email…" />
                    </div>

                    {pickerQuery.length >= 2 && (
                      <div className="rounded-md border">
                        <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                          <span>{pickerSearching ? "Searching…" : `${pickerResults.length} result${pickerResults.length !== 1 ? "s" : ""}`}</span>
                          {pickerResults.length > 0 && (
                            <button type="button" className="font-medium text-kolekto-orange hover:underline" onClick={selectAllShown}>
                              Select all shown
                            </button>
                          )}
                        </div>
                        <div className="max-h-56 overflow-y-auto">
                          {pickerResults.map((r) => {
                            const key = r.email.toLowerCase();
                            const already = existingRecipientEmails.has(key);
                            const picked = selectedPicks.has(key);
                            return (
                              <label
                                key={r.id}
                                className={cn(
                                  "flex items-center gap-2 border-b px-3 py-2 text-sm last:border-b-0",
                                  already ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-accent",
                                )}
                              >
                                <Checkbox checked={picked || already} disabled={already} onCheckedChange={() => togglePick(r)} />
                                <span className="font-medium">{r.full_name || "—"}</span>
                                <span className="text-muted-foreground">{r.email}</span>
                                {already && <span className="ml-auto text-xs text-muted-foreground">already added</span>}
                              </label>
                            );
                          })}
                          {!pickerSearching && pickerResults.length === 0 && (
                            <p className="px-3 py-3 text-sm text-muted-foreground">No matches.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedPicks.size > 0 && (
                      <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Label className="text-xs text-muted-foreground">Selected ({selectedPicks.size}) — kept while you keep searching</Label>
                          <Button size="sm" onClick={handleAddSelectedPicks} disabled={addingRecipients} className="gap-2">
                            {addingRecipients ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Add {selectedPicks.size} to campaign
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {Array.from(selectedPicks.entries()).map(([key, r]) => (
                            <Badge key={key} variant="outline" className="gap-1.5 border-slate-200 bg-white text-slate-700">
                              {r.email}
                              <button type="button" onClick={() => removePick(key)} className="hover:text-destructive">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                      onClick={() => setShowPasteBox((v) => !v)}
                    >
                      {showPasteBox ? "Hide paste box" : "Or paste a list of emails instead"}
                    </button>

                    {showPasteBox && (
                      <div className="space-y-2">
                        <Label>Add recipients (one email per line, or comma-separated)</Label>
                        <Textarea value={recipientDraft} onChange={(e) => setRecipientDraft(e.target.value)} rows={4} placeholder="user@example.com" />
                        <Button size="sm" onClick={handleAddRecipients} disabled={addingRecipients} className="gap-2">
                          {addingRecipients ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          Add recipients
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Added to this campaign ({recipients.length})</Label>
                  {recipients.length === 0 && <p className="text-sm text-muted-foreground">No recipients added yet.</p>}
                  {recipients.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span>{r.email}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={STATUS_STYLES[r.status] || ""}>
                          {r.status}
                        </Badge>
                        {isEditable && r.status === "pending" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            title="Remove this recipient"
                            disabled={removingRecipientId === r.id}
                            onClick={() => handleRemoveRecipient(r.id)}
                          >
                            {removingRecipientId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="space-y-4 p-4">
                <AudienceFilterBuilder value={audienceFilters} onChange={setAudienceFilters} />

                <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 p-3">
                  <div className="text-sm">
                    {audiencePreviewLoading ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculating…
                      </span>
                    ) : (audiencePreview?.noFilterConfigured ?? !hasAudienceConditions) ? (
                      // "Nothing configured" and "configured, matches nobody" are
                      // different problems with different fixes, so they get
                      // different messages. This branch is what used to render
                      // "609 matching recipients" for an empty filter.
                      <span className="text-muted-foreground">
                        No audience configured — add at least one condition below.
                      </span>
                    ) : (
                      <>
                        <span className="font-semibold text-slate-950">{audiencePreview?.eligible ?? 0}</span>{" "}
                        <span className="text-muted-foreground">
                          eligible recipient{(audiencePreview?.eligible ?? 0) !== 1 ? "s" : ""}
                        </span>
                        {(audiencePreview?.total ?? 0) !== (audiencePreview?.eligible ?? 0) && (
                          <span className="text-muted-foreground">
                            {" "}· {audiencePreview?.total ?? 0} matching, {audiencePreview?.unsubscribed ?? 0} unsubscribed
                          </span>
                        )}
                        {(audienceFilters.excludeEmails?.length ?? 0) > 0 && (
                          <span className="text-muted-foreground"> · {audienceFilters.excludeEmails!.length} excluded</span>
                        )}
                      </>
                    )}
                  </div>
                  {isEditable && (
                    <Button
                      size="sm"
                      onClick={handleSaveAudienceFilter}
                      // Blocked rather than allowed-then-rejected: saving an
                      // empty filter is what previously produced a success
                      // toast for an audience that would send to nobody.
                      disabled={savingFilter || !hasAudienceConditions}
                      title={!hasAudienceConditions ? "Add at least one audience condition first" : undefined}
                      className="gap-2"
                    >
                      {savingFilter ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Save filter to campaign
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={handleExportCsv} disabled={exportingCsv} className="gap-2">
                    {exportingCsv ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Export CSV
                  </Button>
                </div>

                {audiencePreview && audiencePreview.sample.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Matching recipients — remove anyone you don't want to include</Label>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          disabled={audiencePage === 0}
                          onClick={() => setAudiencePage((p) => Math.max(0, p - 1))}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {audiencePage * AUDIENCE_PAGE_SIZE + 1}–{Math.min((audiencePage + 1) * AUDIENCE_PAGE_SIZE, audiencePreview.total)} of {audiencePreview.total}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          disabled={(audiencePage + 1) * AUDIENCE_PAGE_SIZE >= audiencePreview.total}
                          onClick={() => setAudiencePage((p) => p + 1)}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {audiencePreview.sample.map((s) => (
                        <div key={s.id} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
                          <span>
                            {s.full_name || "—"} <span className="text-muted-foreground">· {s.email}</span>
                          </span>
                          {isEditable && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              title="Exclude from this campaign"
                              onClick={() => excludeFromAudience(s.email)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(audienceFilters.excludeEmails?.length ?? 0) > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Excluded</Label>
                    <div className="flex flex-wrap gap-2">
                      {audienceFilters.excludeEmails!.map((email) => (
                        <Badge key={email} variant="outline" className="gap-1.5 border-slate-200 bg-slate-50 text-slate-600">
                          {email}
                          {isEditable && (
                            <button type="button" onClick={() => includeBackInAudience(email)} className="hover:text-destructive">
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="attachments" className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-4">
              {isEditable && (
                <FileUpload
                  accept=".pdf,.docx,.xlsx,image/png,image/jpeg,image/webp"
                  maxSizeBytes={10 * 1024 * 1024}
                  label="Upload PDF, DOCX, XLSX, or image attachments"
                  hint="Max 10MB per file"
                  onUpload={handleUploadAttachment}
                />
              )}
              <div className="space-y-2">
                {attachments.map((a) => (
                  <FileListItem
                    key={a.id}
                    name={a.file_name}
                    sizeLabel={`${(a.file_size / 1024).toFixed(0)} KB`}
                    onRemove={isEditable ? () => handleDeleteAttachment(a.id) : undefined}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-4">
              <Label>Send a test email</Label>
              <Textarea value={testEmails} onChange={(e) => setTestEmails(e.target.value)} rows={2} placeholder="you@example.com, teammate@example.com" />
              <Button onClick={handleSendTest} disabled={sendingTest} className="gap-2">
                {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {testSendState === "saving"
                  ? "Saving draft..."
                  : testSendState === "sending"
                  ? "Sending test..."
                  : testSendState === "failed"
                  ? "Failed — Retry"
                  : testSendState === "sent"
                  ? "Sent — Send again"
                  : "Send Test Email"}
              </Button>
              {testSendState === "sent" && (
                <p className="text-xs text-green-700">Test sent successfully. Check the inbox above.</p>
              )}
              {testSendState === "failed" && (
                <p className="text-xs text-red-700">The test could not be sent. Fix the issue above and retry.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email preview</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Label className="text-xs text-muted-foreground">Preview as recipient (optional — leave blank for sample data)</Label>
            <div className="relative mt-1">
              <Input
                value={recipientQuery}
                onChange={(e) => {
                  setRecipientQuery(e.target.value);
                  setRecipientSearchOpen(true);
                  if (e.target.value === "") handleSelectPreviewRecipient(null);
                }}
                onFocus={() => setRecipientSearchOpen(true)}
                placeholder="Search by name or email…"
              />
              {recipientSearchOpen && recipientResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                  {recipientResults.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                      onClick={() => handleSelectPreviewRecipient(r)}
                    >
                      <span className="font-medium">{r.full_name || "—"}</span>{" "}
                      <span className="text-muted-foreground">{r.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {previewLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-kolekto-orange" />
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Subject: <span className="font-medium text-slate-950">{previewSubject}</span>
              </p>
              {/* sandbox="" gives the frame an opaque origin with no script
                  execution, no form submission and no access to this page —
                  a srcDoc iframe is same-origin by default, so without it a
                  script in a campaign body could reach window.parent and the
                  admin session behind it. */}
              <iframe
                title="Email preview"
                srcDoc={sanitizePreviewDocument(previewHtml)}
                sandbox=""
                className="h-[65vh] w-full rounded-md border bg-white"
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={sendNowOpen} onOpenChange={setSendNowOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ready to send</AlertDialogTitle>
            <AlertDialogDescription asChild>
              {/* Every number here is server-computed (audience-summary), never
                  inferred from the live filter preview. Attached and filter
                  counts are listed separately because they overlap — the send
                  de-duplicates them, so a single summed total would overstate it. */}
              <div className="space-y-3">
                <p>
                  This will send <span className="font-medium text-foreground">"{name}"</span> immediately.
                  This cannot be undone.
                </p>

                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <div className="mb-1.5 font-medium text-foreground">Recipients</div>
                  <ul className="space-y-1">
                    <li className="flex justify-between gap-4">
                      <span>Attached directly</span>
                      <span className="font-medium text-foreground">{attachedRecipients.toLocaleString()}</span>
                    </li>
                    {filterConfigured && (
                      <li className="flex justify-between gap-4">
                        <span>Eligible from audience filter</span>
                        <span className="font-medium text-foreground">{eligibleFromFilter.toLocaleString()}</span>
                      </li>
                    )}
                    {unsubscribedExcluded > 0 && (
                      <li className="flex justify-between gap-4">
                        <span>Excluded (unsubscribed)</span>
                        <span className="font-medium text-foreground">{unsubscribedExcluded.toLocaleString()}</span>
                      </li>
                    )}
                  </ul>
                  {filterConfigured && attachedRecipients > 0 ? (
                    <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                      Up to {estimatedRecipients.toLocaleString()} emails. Anyone both attached and
                      matching the filter is sent to once.
                    </p>
                  ) : (
                    <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                      {estimatedRecipients.toLocaleString()} email{estimatedRecipients !== 1 ? "s" : ""} will be sent.
                    </p>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendingNow}>Cancel</AlertDialogCancel>
            {/* onClick — NOT onSelect. AlertDialogAction renders a Radix
                button, which has no onSelect prop; `onSelect` on a <button>
                is the native text-selection event and never fires on a click,
                so the dialog closed and the send was never dispatched.

                preventDefault() is what keeps the dialog open while the
                request is in flight: Radix composes its own "close" handler
                after this one and skips it when the event was defaulted-
                prevented. That lets the admin see "Starting campaign...".
                handleSendNow closes the dialog itself on success, and leaves
                it open on failure so the error is visible. */}
            <AlertDialogAction
              disabled={sendingNow}
              onClick={(e) => {
                e.preventDefault();
                void handleSendNow();
              }}
              className="gap-2 bg-kolekto-orange text-white hover:bg-kolekto-orange/90"
            >
              {sendingNow && <Loader2 className="h-4 w-4 animate-spin" />}
              {sendPhase === "saving"
                ? "Saving draft..."
                : sendPhase === "starting"
                ? "Starting campaign..."
                : "Send Now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{campaign?.status === "scheduled" ? "Reschedule this campaign" : "Schedule this campaign"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {/* The audience is re-resolved by the scheduler when the time
                  arrives, so this is the count as of now, not a locked-in set. */}
              "{name}" will be sent automatically at the time you choose below — currently{" "}
              {estimatedRecipients.toLocaleString()} recipient{estimatedRecipients !== 1 ? "s" : ""}
              {filterConfigured ? " (the audience filter is re-evaluated at send time)" : ""}.
            </p>
            <div className="space-y-1.5">
              <Label>Date &amp; time</Label>
              <Input
                type="datetime-local"
                value={scheduleValue}
                min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                onChange={(e) => setScheduleValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)} disabled={scheduling}>
              Cancel
            </Button>
            <Button onClick={handleSchedule} disabled={scheduling || !scheduleValue} className="gap-2 bg-kolekto-orange text-white hover:bg-kolekto-orange/90">
              {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
              {campaign?.status === "scheduled" ? "Reschedule" : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
