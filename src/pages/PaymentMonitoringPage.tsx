// Payment Monitoring & Recovery Center.
//
// Gives admins complete visibility into payment state without SQL or
// terminal access: which payments succeeded cleanly, which were recovered
// by the scheduled sweep / webhook / manual reconcile, which are still
// pending verification, which have failed recovery attempts, and which are
// orphaned (Paystack succeeded, nothing here ever recorded it). Backed by
// GET /adminurlabdkole/payment-monitoring — see
// kolekto-be-old/controllers/admin/paymentMonitoring.js for the
// categorization logic.

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Eye, RotateCcw, CheckCircle2, AlertTriangle, Clock, Loader2, ServerOff } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { useToast } from "@/components/ui/use-toast";
import { axiosInstance } from "@/lib/axios";

interface PaymentItem {
  reference: string;
  collectionId: string;
  collectionTitle: string | null;
  contactName: string | null;
  contactEmail: string | null;
  amount: number | null;
  totalPayable: number | null;
  createdAt: string;
  ageMinutes: number;
  category: "successful" | "pending" | "recovered" | "failed" | "orphaned" | "resolved";
  isResolved: boolean;
  contribution: { id: string; status: string; amount: number; createdAt: string } | null;
  attemptCount: number;
  lastAttempt: { invocation_source: string | null; success: boolean; created_at: string } | null;
  lastError: { error_message: string | null; created_at: string } | null;
}

interface DashboardData {
  stats: {
    successfulToday: number;
    recoveredToday: number;
    pendingVerification: number;
    orphaned: number;
    failedRecoveries: number;
    avgRecoveryMs: number | null;
    mttrMs: number | null;
    awaitingRecovery: number;
    /** Total payments with no contribution yet, any age — the true in-flight count. */
    awaitingContribution: number;
    nextSweepInSeconds: number;
    successRateBySource: Record<string, number | null>;
    /** ISO timestamp from the server at the time data was fetched. */
    serverNow?: string;
  };
  categories: Record<string, PaymentItem[]>;
}

function formatDuration(ms: number | null) {
  if (ms == null) return "—";
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours}h ${remMinutes}m`;
}

const CATEGORY_BADGE: Record<string, { label: string; className: string }> = {
  successful: { label: "Successful", className: "bg-green-100 text-green-700 border-green-200" },
  recovered: { label: "Recovered", className: "bg-blue-100 text-blue-700 border-blue-200" },
  pending: { label: "Pending Verification", className: "bg-amber-100 text-amber-700 border-amber-200" },
  failed: { label: "Failed Recovery", className: "bg-red-100 text-red-700 border-red-200" },
  orphaned: { label: "Orphaned", className: "bg-red-200 text-red-900 border-red-300" },
  resolved: { label: "Resolved", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

const TABS: Array<{ key: string; label: string }> = [
  { key: "awaiting", label: "Awaiting Contribution" },
  { key: "all", label: "All" },
  { key: "orphaned", label: "Orphaned" },
  { key: "failed", label: "Failed" },
  { key: "pending", label: "In Progress (<5m)" },
  { key: "recovered", label: "Recovered" },
  { key: "successful", label: "Successful" },
];

function money(n: number | null) {
  if (n == null) return "—";
  return `₦${Number(n).toLocaleString("en-NG")}`;
}

function timeAgo(minutes: number) {
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
}

const PaymentMonitoringPage = () => {
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);
  const [retryingAll, setRetryingAll] = useState(false);
  const [nextSweepCountdown, setNextSweepCountdown] = useState<number | null>(null);
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [secondsSinceRefresh, setSecondsSinceRefresh] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setBackendUnavailable(false);
    try {
      const { data: result } = await axiosInstance.get<DashboardData>("/adminurlabdkole/payment-monitoring");
      setData(result);
      setNextSweepCountdown(result.stats.nextSweepInSeconds);
      setLastRefreshedAt(new Date());
      setSecondsSinceRefresh(0);
    } catch (err: any) {
      // ERR_NETWORK / ERR_CONNECTION_REFUSED = backend not running.
      // Show a targeted "server offline" UI rather than a generic error toast
      // that gives no actionable guidance.
      const isConnectionRefused = !err?.response;
      if (isConnectionRefused) {
        setBackendUnavailable(true);
      } else {
        toast({
          title: "Failed to load payment monitoring data",
          description: err?.response?.data?.error || err?.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh every 30 seconds so new payments initiated after the admin
  // opened the page appear without manual intervention. This is the primary
  // fix for "initiated payments not appearing instantly" — the dashboard is
  // no longer a static snapshot. 30s is short enough to catch a Paystack
  // bank transfer that confirmed in < 1 minute, but cheap enough (~2 extra
  // API calls/minute per admin session) to run continuously.
  useEffect(() => {
    const AUTO_REFRESH_MS = 30_000;
    const interval = setInterval(() => {
      // Only auto-refresh if the page is visible — avoids unnecessary work
      // when an admin leaves the tab open in the background.
      if (document.visibilityState === "visible") {
        load();
      }
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  // Ticks the "updated Ns ago" counter every second using the client clock.
  useEffect(() => {
    if (!lastRefreshedAt) return;
    const interval = setInterval(() => {
      setSecondsSinceRefresh(Math.floor((Date.now() - lastRefreshedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastRefreshedAt]);

  // Live countdown to the next sweep run, ticking client-side between
  // refreshes (the sweep runs server-side on its own pg_cron schedule
  // regardless — this is just a UI clock, not what triggers it). Re-fetches
  // the dashboard once the countdown reaches zero so newly-recovered
  // payments show up without a manual refresh.
  useEffect(() => {
    if (nextSweepCountdown == null) return;
    const interval = setInterval(() => {
      setNextSweepCountdown((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          load();
          return 300;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [nextSweepCountdown == null, load]);

  const handleRetry = async (reference: string) => {
    setActionInFlight(reference);
    try {
      const { data: result } = await axiosInstance.post(`/adminurlabdkole/payment-monitoring/${encodeURIComponent(reference)}/retry`);
      toast({
        title: result.ok ? "Recovered" : "Retry failed",
        description: result.ok ? `${reference} now has a recorded contribution.` : "See payment detail for the error — it will be retried automatically by the scheduled sweep.",
        variant: result.ok ? undefined : "destructive",
      });
      await load();
    } catch (err: any) {
      toast({ title: "Retry failed", description: err?.response?.data?.error || err?.message, variant: "destructive" });
    } finally {
      setActionInFlight(null);
    }
  };

  const handleRetryAll = async () => {
    setRetryingAll(true);
    try {
      const { data: result } = await axiosInstance.post("/adminurlabdkole/payment-monitoring/retry-all-failed");
      toast({
        title: "Retry-all complete",
        description: `${result.recovered} recovered, ${result.stillFailed} still failing (will retry automatically every 5 minutes).`,
      });
      await load();
    } catch (err: any) {
      toast({ title: "Retry-all failed", description: err?.response?.data?.error || err?.message, variant: "destructive" });
    } finally {
      setRetryingAll(false);
    }
  };

  const items = data?.categories?.[activeTab] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Monitoring &amp; Recovery</h1>
          <p className="text-sm text-muted-foreground">
            Every payment Paystack confirmed, what happened to it, and what to do about the ones that didn't make it through cleanly.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshedAt && !loading && (
            <span className="text-xs text-muted-foreground tabular-nums">
              Updated {secondsSinceRefresh < 5 ? "just now" : `${secondsSinceRefresh}s ago`}
            </span>
          )}
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {backendUnavailable && (
        <Card className="border-slate-300 bg-slate-50">
          <CardContent className="py-6 flex flex-col items-center gap-3 text-center">
            <ServerOff className="h-8 w-8 text-slate-400" />
            <div>
              <p className="font-medium text-slate-700">Payment monitoring service is currently unavailable</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please verify that the backend server is running at{" "}
                <code className="text-xs bg-slate-100 border rounded px-1 py-0.5">
                  {import.meta.env.VITE_API_URL || "http://localhost:5050/api"}
                </code>
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? "animate-spin" : ""}`} />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          {/* Operational pulse: true in-flight count (awaitingContribution)
              is the primary signal — it counts ALL payments with no
              contribution yet, any age. awaitingRecovery (≥5 min only)
              is the subset the scheduled sweep will act on next.
              Distinguishing the two lets admins see fresh missed payments
              (< 5 min, callback hasn't fired) alongside older orphaned ones
              without waiting for the sweep threshold to pass.
              "0 awaiting" across both = every initiated payment has a
              contribution — the system is fully healthy. */}
          <Card className={
            data.stats.awaitingContribution > 0
              ? "border-amber-300 bg-amber-50"
              : "border-green-200 bg-green-50"
          }>
            <CardContent className="py-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm">
                {data.stats.awaitingContribution > 0 ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <span>
                      <strong>{data.stats.awaitingContribution}</strong>{" "}
                      payment{data.stats.awaitingContribution !== 1 ? "s" : ""} awaiting contribution
                      {data.stats.awaitingRecovery > 0 && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          ({data.stats.awaitingRecovery} eligible for sweep)
                        </span>
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span>All initiated payments have a recorded contribution</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Next sweep: {nextSweepCountdown != null ? `in ${Math.max(0, Math.floor(nextSweepCountdown / 60))}m ${Math.max(0, nextSweepCountdown % 60)}s` : "—"}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatsCard title="Successful Today" value={String(data.stats.successfulToday)} icon="check" variant="success" description="Clean, no recovery needed" />
            <StatsCard title="Recovered Today" value={String(data.stats.recoveredToday)} icon="check" variant="default" description="Sweep / webhook / admin" />
            <StatsCard
              title="In Progress"
              value={String(data.stats.pendingVerification)}
              icon="clock"
              variant={data.stats.pendingVerification > 0 ? "warning" : "default"}
              notification={data.stats.pendingVerification > 0}
              description="Initiated < 5m ago, callback/webhook expected"
            />
            <StatsCard title="Orphaned" value={String(data.stats.orphaned)} icon="alert-circle" variant="danger" notification={data.stats.orphaned > 0} description="≥5m, sweep will recover" />
            <StatsCard title="Failed Recoveries" value={String(data.stats.failedRecoveries)} icon="alert-circle" variant="danger" notification={data.stats.failedRecoveries > 0} description="Retrying every 5 min" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard
              title="Mean Time To Recovery"
              value={formatDuration(data.stats.mttrMs)}
              icon="clock"
              variant={data.stats.mttrMs != null && data.stats.mttrMs > 30 * 60 * 1000 ? "warning" : "default"}
              description="Checkout → recorded, last 7 days — the real health signal"
            />
            <StatsCard
              title="Scheduled Recovery Success Rate"
              value={data.stats.successRateBySource.scheduled_recovery != null ? `${data.stats.successRateBySource.scheduled_recovery}%` : "—"}
              icon="shield"
              description="Today"
            />
            <StatsCard
              title="Frontend Callback Success Rate"
              value={data.stats.successRateBySource.frontend_callback != null ? `${data.stats.successRateBySource.frontend_callback}%` : "—"}
              icon="check"
              description="Today — low values suggest a UI/redirect issue"
            />
          </div>
        </>
      )}

      {data && data.stats.orphaned > 0 && (
        <Card className="border-status-error/30 bg-red-50">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-status-error flex-shrink-0" />
            <p className="text-sm">
              <strong>{data.stats.orphaned} orphaned payment{data.stats.orphaned > 1 ? "s" : ""}</strong> — Paystack confirmed
              these but nothing here has recorded them yet. The scheduled sweep retries every 5 minutes automatically;
              use Retry below if you don't want to wait.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payments</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </div>
          {(activeTab === "failed" || (activeTab === "awaiting" && (data?.categories?.failed?.length ?? 0) > 0)) && items.length > 0 && (
            <Button size="sm" onClick={handleRetryAll} disabled={retryingAll}>
              {retryingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Retry All Failed
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              {TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key}>
                  {t.label}
                  {data?.categories?.[t.key]?.length ? ` (${data.categories[t.key].length})` : ""}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : items.length === 0 ? (
                <p className="text-center py-12 text-sm text-muted-foreground">Nothing here.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Collection</TableHead>
                      <TableHead>Contributor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.reference}>
                        <TableCell className="font-mono text-xs">{item.reference}</TableCell>
                        <TableCell className="max-w-[160px] truncate">{item.collectionTitle || item.collectionId}</TableCell>
                        <TableCell>
                          <div className="text-sm">{item.contactName || "—"}</div>
                          <div className="text-xs text-muted-foreground">{item.contactEmail || ""}</div>
                        </TableCell>
                        <TableCell>{money(item.amount)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{timeAgo(item.ageMinutes)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={CATEGORY_BADGE[item.category]?.className}>
                            {CATEGORY_BADGE[item.category]?.label || item.category}
                          </Badge>
                          {item.attemptCount > 0 && (
                            <div className="text-[10px] text-muted-foreground mt-1">{item.attemptCount} attempt{item.attemptCount > 1 ? "s" : ""}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button asChild size="sm" variant="ghost">
                            <Link to={`/payment-monitoring/${encodeURIComponent(item.reference)}`}>
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          {/* Retry is idempotent: if Paystack hasn't confirmed yet
                              it returns without creating anything — safe at any age. */}
                          {(item.category === "orphaned" || item.category === "failed" || item.category === "pending") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={actionInFlight === item.reference}
                              onClick={() => handleRetry(item.reference)}
                            >
                              {actionInFlight === item.reference ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentMonitoringPage;
