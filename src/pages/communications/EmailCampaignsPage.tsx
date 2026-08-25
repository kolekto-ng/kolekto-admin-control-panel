import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { formatDateTime } from "@/lib/formatters";
import { listCampaigns, deleteCampaign, createCampaign, type CampaignStatus, type EmailCampaignSummary } from "./api";

const TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "scheduled", label: "Scheduled" },
  { value: "sending", label: "Sending" },
  { value: "sent", label: "Sent" },
];

const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  scheduled: "border-blue-200 bg-blue-50 text-blue-700",
  sending: "border-amber-200 bg-amber-50 text-amber-700",
  sent: "border-green-200 bg-green-50 text-green-700",
  // Amber, not green: a campaign that finished with failures must not read
  // as a clean success in the list view.
  completed_with_errors: "border-amber-300 bg-amber-50 text-amber-800",
  failed: "border-red-200 bg-red-50 text-red-700",
  cancelled: "border-slate-200 bg-slate-100 text-slate-500",
};

const STATUS_LABELS: Partial<Record<CampaignStatus, string>> = {
  completed_with_errors: "completed with errors",
};

const PAGE_SIZE = 20;

// Shared by the "Email Campaigns", "Drafts", and "Scheduled Emails" sidebar
// entries — they point here with a different default ?status= so they're
// distinct nav destinations without duplicating this list.
export default function EmailCampaignsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get("status") || "all";

  const [campaigns, setCampaigns] = useState<EmailCampaignSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<EmailCampaignSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { campaigns, total } = await listCampaigns({
        status: statusParam === "all" ? undefined : statusParam,
        search: query || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setCampaigns(campaigns);
      setTotal(total);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, [statusParam, query, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [statusParam, query]);

  async function handleCreate() {
    setCreating(true);
    try {
      const campaign = await createCampaign({ name: "Untitled Campaign" });
      navigate(`/communications/campaigns/${campaign.id}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to create campaign");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCampaign(deleteTarget.id);
      toast.success("Draft deleted");
      setDeleteTarget(null);
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to delete campaign");
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-kolekto-orange">Communications</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Email Campaigns</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create, schedule, and track email campaigns sent from Kolekto.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={load} variant="outline" disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={handleCreate} disabled={creating} className="gap-2 bg-kolekto-orange text-white hover:bg-kolekto-orange/90">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            New Campaign
          </Button>
        </div>
      </div>

      <Tabs value={statusParam} onValueChange={(v) => setSearchParams(v === "all" ? {} : { status: v })}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search campaigns by name…" className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            {total} campaign{total !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-kolekto-orange" />
            </div>
          )}
          {!loading && campaigns.length === 0 && (
            <div className="p-10 text-center text-sm text-muted-foreground">No campaigns yet. Create one to get started.</div>
          )}
          {!loading &&
            campaigns.map((c) => (
              <Link
                key={c.id}
                to={`/communications/campaigns/${c.id}`}
                className="grid grid-cols-[1fr_120px_120px_160px_auto] items-center gap-3 border-b p-4 text-sm last:border-b-0 hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-950">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.subject || "No subject"}</p>
                </div>
                <div>
                  <Badge variant="outline" className={STATUS_STYLES[c.status]}>
                    {STATUS_LABELS[c.status] ?? c.status}
                  </Badge>
                </div>
                {/* Delivery breakdown, not just an audience size — the whole
                    point of a history view is being able to see at a glance
                    which campaigns had failures without opening each one.
                    `stats` is null when the summary query degraded, in which
                    case we fall back to the audience count alone. */}
                <div className="text-xs text-muted-foreground">
                  <div>{c.recipient_count.toLocaleString()} recipient{c.recipient_count !== 1 ? "s" : ""}</div>
                  {c.stats && c.stats.total > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-x-2">
                      <span className="text-green-700">{c.stats.delivered.toLocaleString()} sent</span>
                      {c.stats.failed > 0 && (
                        <span className="text-red-700">{c.stats.failed.toLocaleString()} failed</span>
                      )}
                      {c.stats.queued + c.stats.processing + c.stats.retrying > 0 && (
                        <span className="text-amber-700">
                          {(c.stats.queued + c.stats.processing + c.stats.retrying).toLocaleString()} pending
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {c.status === "scheduled" && c.scheduled_at
                    ? `Scheduled ${formatDateTime(c.scheduled_at)}`
                    : c.sent_at
                      ? `Sent ${formatDateTime(c.sent_at)}`
                      : `Updated ${formatDateTime(c.updated_at)}`}
                </div>
                <div className="flex justify-end">
                  {c.status === "draft" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        setDeleteTarget(c);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Link>
            ))}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>Page {page} of {totalPages} ({total} results)</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete draft campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
