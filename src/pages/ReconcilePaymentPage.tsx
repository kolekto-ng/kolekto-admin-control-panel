// F5 — Admin "Reconcile Payment" page.
//
// Use case: a contributor paid on Paystack but the contribution never landed
// in Kolekto (closed tab on callback, killed mobile browser, network glitch).
// Admin pastes the Paystack reference here and clicks Reconcile. The backend
// invokes the same verify edge function the frontend would have called —
// idempotent and safe to retry.

import { useState } from "react";
import { Wrench, AlertCircle, CheckCircle2, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { axiosInstance } from "@/lib/axios";

interface ReconcileResult {
  ok?: boolean;
  message?: string;
  error?: string;
  code?: string;
  reference?: string;
  edgeStatus?: number;
  receiptData?: Record<string, unknown> | null;
  contributions?: Array<Record<string, unknown>>;
}

const ReconcilePaymentPage = () => {
  const { toast } = useToast();
  const [reference, setReference] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ref = reference.trim();
    if (!ref) {
      setError("Please paste a Paystack reference.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const cid = collectionId.trim();
      const { data } = await axiosInstance.post<ReconcileResult>(
        "/adminurlabdkole/reconcile-payment",
        cid ? { reference: ref, collectionId: cid } : { reference: ref }
      );
      setResult(data);
      toast({
        title: "Reconciliation succeeded",
        description:
          data.message ||
          "The payment has been recovered and the contribution is recorded.",
      });
    } catch (err: any) {
      const status = err?.response?.status;
      const backendError = err?.response?.data?.error;
      const code = err?.response?.data?.code;

      let userMessage = backendError || err?.message || "Reconciliation failed.";
      if (status === 403) {
        userMessage =
          "Your account does not have permission to reconcile payments. " +
          "Confirm your email is in ADMIN_EMAILS.";
      } else if (status === 400 && code === "MISSING_REFERENCE") {
        userMessage = "Please paste a Paystack reference.";
      } else if (status === 400 && code === "INVALID_REFERENCE") {
        userMessage = "The reference looks malformed. Copy it again from Paystack.";
      } else if (status === 400 && code === "INVALID_COLLECTION_ID") {
        userMessage = "The collection ID looks malformed.";
      } else if (!status) {
        userMessage = "Could not reach the backend. Check your connection.";
      }

      setError(userMessage);
      setResult(err?.response?.data || null);
      toast({
        title: "Reconciliation failed",
        description: userMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value).catch(() => undefined);
    toast({ title: "Copied", description: "Copied to clipboard." });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Wrench className="h-6 w-6 text-kolekto-orange" />
        <h1 className="text-2xl font-bold tracking-tight">Reconcile Payment</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recover a lost payment</CardTitle>
          <CardDescription>
            Paste a Paystack reference for a payment that succeeded on Paystack but
            wasn't recorded on Kolekto. The verify edge function will be invoked
            and the contribution will be created if it doesn't exist.
            <br />
            <span className="text-xs text-muted-foreground">
              This action is idempotent — running it on an already-recorded payment is a safe no-op.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reference">Paystack reference</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. kolekto-1700000000-123456"
                disabled={loading}
                className="font-mono"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Find this on Paystack dashboard → Transactions → Reference column.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="collectionId">Collection ID (optional)</Label>
              <Input
                id="collectionId"
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                placeholder="Only needed if reconciliation says metadata is missing"
                disabled={loading}
                className="font-mono"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank normally. Only fill this in if a first attempt failed with
                "Missing collection ID in payment metadata" — confirm the right
                collection on Paystack (by the contributor's email/amount/time) before
                pasting its ID here.
              </p>
            </div>

            <Button type="submit" disabled={loading || !reference.trim()}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reconciling…
                </>
              ) : (
                <>
                  <Wrench className="h-4 w-4 mr-2" />
                  Reconcile
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-status-error/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-status-error flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="font-medium text-status-error">Reconciliation failed</p>
                <p className="text-sm text-foreground">{error}</p>
                {result?.code && (
                  <p className="text-xs text-muted-foreground font-mono">
                    code: {result.code}
                    {result.edgeStatus ? ` · edge status: ${result.edgeStatus}` : ""}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result && result.ok && (
        <Card className="border-status-success/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-status-success" />
              <CardTitle className="text-lg">
                {result.message || "Reconciliation succeeded"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.reference && (
              <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Reference</p>
                  <p className="font-mono">{result.reference}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(result.reference!)}
                  className="h-8"
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy
                </Button>
              </div>
            )}

            {Array.isArray(result.contributions) && result.contributions.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">
                  {result.contributions.length} contribution row(s) on record:
                </p>
                <ul className="space-y-2">
                  {result.contributions.map((c, i) => (
                    <li
                      key={i}
                      className="rounded-md border px-3 py-2 text-sm grid grid-cols-2 gap-x-4 gap-y-1"
                    >
                      <span className="text-muted-foreground">Name</span>
                      <span>{String(c.name ?? "—")}</span>
                      <span className="text-muted-foreground">Amount</span>
                      <span>₦{Number(c.amount ?? 0).toLocaleString()}</span>
                      {c.uniqueCode ? (
                        <>
                          <span className="text-muted-foreground">Code</span>
                          <span className="font-mono">{String(c.uniqueCode)}</span>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.receiptData && (
              <details className="rounded-md border bg-muted/30">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                  Full receipt data (debug)
                </summary>
                <pre className="text-xs overflow-x-auto p-3 max-h-96">
                  {JSON.stringify(result.receiptData, null, 2)}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReconcilePaymentPage;
