import { useCallback, useEffect, useMemo, useState } from "react";
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
  downloadAudienceCsv,
  searchRecipients,
  type EmailCampaign,
  type EmailCampaignRecipient,
  type EmailCampaignAttachment,
  type EmailTemplate,
  type AudienceFilters,
  type AudiencePreview,
  type RecipientSearchResult,
} from "./api";

const STATUS_STYLES: Record<string, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  scheduled: "border-blue-200 bg-blue-50 text-blue-700",
  sending: "border-amber-200 bg-amber-50 text-amber-700",
  sent: "border-green-200 bg-green-50 text-green-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  cancelled: "border-slate-200 bg-slate-100 text-slate-500",
};

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
  const [audienceFilters, setAudienceFilters] = useState<AudienceFilters>({});
  const [audiencePreview, setAudiencePreview] = useState<AudiencePreview | null>(null);
  const [audiencePreviewLoading, setAudiencePreviewLoading] = useState(false);
  const [audiencePage, setAudiencePage] = useState(0);
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
      (async () => {
        try {
          const created = await createCampaign({ name: "Untitled Campaign" });
          navigate(`/communications/campaigns/${created.id}`, { replace: true });
        } catch (error: any) {
          toast.error(error?.response?.data?.error || "Failed to create campaign");
          navigate("/communications/campaigns");
        }
      })();
      return;
    }

    setLoading(true);
    Promise.all([getCampaign(id), listRecipients(id, { limit: 50 }), listAttachments(id)])
      .then(([{ campaign }, { recipients }, attachments]) => {
        applyCampaign(campaign);
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
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to remove recipient");
    } finally {
      setRemovingRecipientId(null);
    }
  }

  async function handleSaveAudienceFilter() {
    if (!id) return;
    setSavingFilter(true);
    try {
      const updated = await updateCampaign(id, { filterJson: audienceFilters });
      setCampaign(updated);
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
    const emails = testEmails.split(/[\n,]/).map((e) => e.trim()).filter(Boolean);
    if (emails.length === 0) {
      toast.error("Enter at least one test email address");
      return;
    }
    const saved = await handleSave(false);
    if (!saved) return;
    setSendingTest(true);
    try {
      const results = await sendTestEmail(id, emails);
      const failed = results.filter((r) => !r.success);
      if (failed.length === 0) {
        toast.success("Test email sent");
      } else {
        toast.error(`Failed for: ${failed.map((f) => f.to).join(", ")}`);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to send test email");
    } finally {
      setSendingTest(false);
    }
  }

  async function handleSendNow() {
    if (!id) return;
    const saved = await handleSave(false);
    if (!saved) return;
    setSendingNow(true);
    try {
      await sendCampaignNow(id);
      toast.success("Campaign is sending");
      const refreshed = await getCampaign(id);
      applyCampaign(refreshed.campaign);
      setSendNowOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to send campaign");
    } finally {
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

  const effectiveRecipientCount = recipientMode === "filter" ? (audiencePreview?.total ?? 0) : recipientCount;

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
                disabled={effectiveRecipientCount === 0}
                className="gap-2"
              >
                <CalendarClock className="h-4 w-4" /> {campaign?.status === "scheduled" ? "Reschedule" : "Schedule"}
              </Button>
              <Button
                className="gap-2 bg-kolekto-orange text-white hover:bg-kolekto-orange/90"
                onClick={() => setSendNowOpen(true)}
                disabled={effectiveRecipientCount === 0}
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

      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="recipients" className="gap-1">
            <Users className="h-3.5 w-3.5" /> Recipients ({effectiveRecipientCount})
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
                ) : (
                  <div className="rounded-md border p-4 text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: htmlBody }} />
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
                  <div className="space-y-2">
                    <Label>Add recipients (one email per line, or comma-separated)</Label>
                    <Textarea value={recipientDraft} onChange={(e) => setRecipientDraft(e.target.value)} rows={4} placeholder="user@example.com" />
                    <Button size="sm" onClick={handleAddRecipients} disabled={addingRecipients} className="gap-2">
                      {addingRecipients ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Add recipients
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
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
                    ) : (
                      <>
                        <span className="font-semibold text-slate-950">{audiencePreview?.total ?? 0}</span>{" "}
                        <span className="text-muted-foreground">matching recipient{(audiencePreview?.total ?? 0) !== 1 ? "s" : ""}</span>
                        {(audienceFilters.excludeEmails?.length ?? 0) > 0 && (
                          <span className="text-muted-foreground"> · {audienceFilters.excludeEmails!.length} excluded</span>
                        )}
                      </>
                    )}
                  </div>
                  {isEditable && (
                    <Button size="sm" onClick={handleSaveAudienceFilter} disabled={savingFilter} className="gap-2">
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
                Send Test Email
              </Button>
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
              <iframe title="Email preview" srcDoc={previewHtml} className="h-[65vh] w-full rounded-md border" />
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={sendNowOpen} onOpenChange={setSendNowOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this campaign now?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send "{name}" to {effectiveRecipientCount} recipient{effectiveRecipientCount !== 1 ? "s" : ""} immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendingNow}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={sendingNow} onClick={handleSendNow} className="bg-kolekto-orange text-white hover:bg-kolekto-orange/90">
              {sendingNow ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Now"}
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
              "{name}" will be sent automatically to {effectiveRecipientCount} recipient{effectiveRecipientCount !== 1 ? "s" : ""} at the time you choose below.
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
