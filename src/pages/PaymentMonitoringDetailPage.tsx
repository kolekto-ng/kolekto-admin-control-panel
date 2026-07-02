// Full detail view for one payment reference — pulls together everything
// admins previously needed SQL for: the exact contributor_information the
// user submitted (from pending_payment_context, available even if no
// contribution exists yet), a live read-only Paystack preview, the full
// recovery attempt history, and the admin action audit trail. Backed by
// GET /adminurlabdkole/payment-monitoring/:reference.

import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, RotateCcw, CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { axiosInstance } from "@/lib/axios";

interface RecoveryLogRow {
  id: string;
  success: boolean;
  error_code: string | null;
  error_message: string | null;
  metadata_source: string | null;
  invocation_source: string | null;
  attempt_number: number | null;
  duration_ms: number | null;
  note: string | null;
  created_at: string;
}

interface AdminActionRow {
  id: string;
  admin_email: string | null;
  action: string;
  old_status: string | null;
  new_status: string | null;
  reason: string | null;
  notes: string | null;
  created_at: string;
}

interface DetailData {
  reference: string;
  pendingPaymentContext: { metadata: Record<string, any>; collection_id: string; created_at: string } | null;
  contribution: Record<string, any> | null;
  collection: { id: string; title: string; collection_type: string; price_tiers?: Array<{ id: string; name: string }> } | null;
  recoveryLog: RecoveryLogRow[];
  adminActions: AdminActionRow[];
  paystackPreview: { ok: boolean; data?: any; error?: string };
}

function money(n: number | null | undefined) {
  if (n == null) return "—";
  return `₦${Number(n).toLocaleString("en-NG")}`;
}

const PaymentMonitoringDetailPage = () => {
  const { reference } = useParams<{ reference: string }>();
  const { toast } = useToast();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reconcileCollectionId, setReconcileCollectionId] = useState("");
  const [reconcileTierId, setReconcileTierId] = useState("");
  const [resolveReason, setResolveReason] = useState("");
  const [noteText, setNoteText] = useState("");
  const [resolveOpen, setResolveOpen] = useState(false);

  const load = useCallback(async () => {
    if (!reference) return;
    setLoading(true);
    try {
      const { data: result } = await axiosInstance.get<DetailData>(`/adminurlabdkole/payment-monitoring/${encodeURIComponent(reference)}`);
      setData(result);
      setReconcileCollectionId(result.pendingPaymentContext?.collection_id || "");
    } catch (err: any) {
      toast({ title: "Failed to load payment detail", description: err?.response?.data?.error || err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [reference, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (!reference) return null;

  const handleRetry = async () => {
    setBusy(true);
    try {
      const { data: result } = await axiosInstance.post(`/adminurlabdkole/payment-monitoring/${encodeURIComponent(reference)}/retry`);
      toast({ title: result.ok ? "Recovered" : "Retry failed", description: result.ok ? "Contribution recorded." : JSON.stringify(result.body?.error || "See logs."), variant: result.ok ? undefined : "destructive" });
      await load();
    } catch (err: any) {
      toast({ title: "Retry failed", description: err?.response?.data?.error || err?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleManualReconcile = async () => {
    setBusy(true);
    try {
      const { data: result } = await axiosInstance.post(`/adminurlabdkole/payment-monitoring/${encodeURIComponent(reference)}/manual-reconcile`, {
        collectionId: reconcileCollectionId || undefined,
        selectedTierId: reconcileTierId || undefined,
      });
      toast({ title: result.ok ? "Reconciled" : "Reconcile failed", description: result.ok ? "Contribution recorded." : JSON.stringify(result.body?.error || "See logs."), variant: result.ok ? undefined : "destructive" });
      await load();
    } catch (err: any) {
      toast({ title: "Reconcile failed", description: err?.response?.data?.error || err?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleResolve = async () => {
    if (!resolveReason.trim()) {
      toast({ title: "A reason is required", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await axiosInstance.post(`/adminurlabdkole/payment-monitoring/${encodeURIComponent(reference)}/resolve`, { reason: resolveReason });
      toast({ title: "Marked resolved", description: "The scheduled sweep will no longer retry this reference." });
      setResolveOpen(false);
      setResolveReason("");
      await load();
    } catch (err: any) {
      toast({ title: "Failed to resolve", description: err?.response?.data?.error || err?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setBusy(true);
    try {
      await axiosInstance.post(`/adminurlabdkole/payment-monitoring/${encodeURIComponent(reference)}/notes`, { notes: noteText });
      setNoteText("");
      toast({ title: "Note added" });
      await load();
    } catch (err: any) {
      toast({ title: "Failed to add note", description: err?.response?.data?.error || err?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const metadata = data?.pendingPaymentContext?.metadata || {};
  const formData: Record<string, any> = metadata.formData || {};
  const customFieldEntries = Object.entries(formData).filter(([k]) => !["Tier", "TierId", "__fieldValues"].includes(k));
  const hasContribution = Boolean(data?.contribution);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild size="sm" variant="ghost">
          <Link to="/payment-monitoring"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold font-mono">{reference}</h1>
          {data?.collection && <p className="text-sm text-muted-foreground">{data.collection.title}</p>}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">Not found.</p>
      ) : (
        <>
          <Card className={hasContribution ? "border-green-300" : "border-status-error/30"}>
            <CardContent className="pt-6 flex items-center gap-3">
              {hasContribution ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-status-error" />}
              <div>
                <p className="font-medium">{hasContribution ? "Contribution recorded" : "No contribution recorded yet"}</p>
                <p className="text-xs text-muted-foreground">
                  {hasContribution
                    ? `Recorded ${new Date(data.contribution!.created_at).toLocaleString()} — status: ${data.contribution!.status}`
                    : "Paystack preview below shows whether the underlying charge actually succeeded."}
                </p>
              </div>
              {!hasContribution && (
                <Button size="sm" className="ml-auto" onClick={handleRetry} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                  Verify Again
                </Button>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Paystack (live)</CardTitle>
                <CardDescription>Fetched on page load — read-only, never writes anything</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {data.paystackPreview?.ok ? (
                  <>
                    <Row label="Status" value={data.paystackPreview.data?.status} />
                    <Row label="Amount" value={money((data.paystackPreview.data?.amount || 0) / 100)} />
                    <Row label="Channel" value={data.paystackPreview.data?.channel} />
                    <Row label="Customer email" value={data.paystackPreview.data?.customer?.email} />
                    <Row label="Paid at" value={data.paystackPreview.data?.paid_at ? new Date(data.paystackPreview.data.paid_at).toLocaleString() : "—"} />
                  </>
                ) : (
                  <p className="text-muted-foreground">{data.paystackPreview?.error || "Unavailable"}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stored payment context</CardTitle>
                <CardDescription>What the contributor submitted at checkout</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Name" value={metadata.contact?.name || metadata.contactName} />
                <Row label="Email" value={metadata.contact?.email || metadata.contactEmail} />
                <Row label="Phone" value={metadata.contact?.phone || metadata.contactPhone} />
                <Row label="Tier" value={metadata.selectedTier} />
                <Row label="Quantity" value={metadata.quantity} />
                <Row label="Contribution amount" value={money(metadata.contributionAmount)} />
                <Row label="Total payable" value={money(metadata.totalPayable)} />
              </CardContent>
            </Card>
          </div>

          {customFieldEntries.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Custom form responses</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                {customFieldEntries.map(([label, value]) => (
                  <div key={label}>
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div>{String(value)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Recovery attempt history</CardTitle></CardHeader>
            <CardContent>
              {data.recoveryLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attempts logged yet.</p>
              ) : (
                <ul className="space-y-3">
                  {data.recoveryLog.map((log) => (
                    <li key={log.id} className="flex items-start gap-3 text-sm border-b pb-2 last:border-0">
                      {log.success ? <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" /> : <XCircle className="h-4 w-4 text-status-error mt-0.5 flex-shrink-0" />}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{log.invocation_source || log.metadata_source || "unknown"}</Badge>
                          {log.attempt_number && <span className="text-xs text-muted-foreground">attempt #{log.attempt_number}</span>}
                          {log.duration_ms != null && <span className="text-xs text-muted-foreground">{log.duration_ms}ms</span>}
                          <span className="text-xs text-muted-foreground ml-auto">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-xs mt-0.5">{log.note || log.error_message || "—"}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {data.adminActions.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Admin action audit trail</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {data.adminActions.map((a) => (
                    <li key={a.id} className="border-b pb-2 last:border-0">
                      <span className="font-medium">{a.action}</span> by {a.admin_email || "unknown"} — {new Date(a.created_at).toLocaleString()}
                      {a.reason && <p className="text-xs text-muted-foreground">{a.reason}</p>}
                      {a.notes && <p className="text-xs text-muted-foreground">Note: {a.notes}</p>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {!hasContribution && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Manual reconciliation</CardTitle>
                <CardDescription>Only needed if automatic resolution failed — confirm the right collection/tier out-of-band first.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Collection ID</Label>
                    <Input value={reconcileCollectionId} onChange={(e) => setReconcileCollectionId(e.target.value)} className="font-mono text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label>Selected Tier ID</Label>
                    <Input
                      value={reconcileTierId}
                      onChange={(e) => setReconcileTierId(e.target.value)}
                      placeholder={data.collection?.price_tiers?.length ? `e.g. ${data.collection.price_tiers[0].id} (${data.collection.price_tiers[0].name})` : ""}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <Button onClick={handleManualReconcile} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Reconcile
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Notes &amp; resolution</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note for other admins…" className="flex-1" />
                <Button onClick={handleAddNote} disabled={busy || !noteText.trim()}>Add Note</Button>
              </div>
              {!data.pendingPaymentContext?.collection_id ? null : (
                <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Mark Resolved</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Mark {reference} resolved</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Label>Reason (required)</Label>
                      <Textarea value={resolveReason} onChange={(e) => setResolveReason(e.target.value)} placeholder="e.g. confirmed with contributor, payment was never actually completed" />
                    </div>
                    <DialogFooter>
                      <Button onClick={handleResolve} disabled={busy}>
                        {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                        Confirm
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}

export default PaymentMonitoringDetailPage;
