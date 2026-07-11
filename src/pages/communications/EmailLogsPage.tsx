import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Search } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { formatDateTime } from "@/lib/formatters";
import { listEmailLogs, getEmailAnalytics, type EmailLogEntry, type EmailAnalytics } from "./api";

const STATUS_STYLES: Record<string, string> = {
  pending: "border-slate-200 bg-slate-50 text-slate-700",
  processing: "border-slate-200 bg-slate-50 text-slate-700",
  sent: "border-blue-200 bg-blue-50 text-blue-700",
  delivered: "border-green-200 bg-green-50 text-green-700",
  opened: "border-teal-200 bg-teal-50 text-teal-700",
  clicked: "border-amber-200 bg-amber-50 text-amber-700",
  bounced: "border-red-200 bg-red-50 text-red-700",
  failed: "border-red-200 bg-red-50 text-red-700",
};

const LOG_PAGE_SIZE = 25;

// Categorical series colors — fixed order, never reassigned when the data
// changes (see dataviz skill: color follows the entity, not its rank).
const SERIES_COLOR = { sent: "#2a78d6", opened: "#1baf7a", clicked: "#eda100" };

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [analytics, setAnalytics] = useState<EmailAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [days, setDays] = useState(30);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const { logs, total } = await listEmailLogs({
        status: statusFilter === "all" ? undefined : statusFilter,
        search: search || undefined,
        limit: LOG_PAGE_SIZE,
        offset: page * LOG_PAGE_SIZE,
      });
      setLogs(logs);
      setLogsTotal(total);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to load email logs");
    } finally {
      setLogsLoading(false);
    }
  }, [statusFilter, search, page]);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      setAnalytics(await getEmailAnalytics({ days }));
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to load analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(logsTotal / LOG_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-kolekto-orange">Communications</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Email Logs &amp; Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Delivery history across every campaign, plus aggregate performance.</p>
      </div>

      <Tabs defaultValue="logs">
        <TabsList>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by recipient email…" className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.keys(STATUS_STYLES).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={loadLogs} disabled={logsLoading} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${logsLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {logsLoading && (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-kolekto-orange" />
                </div>
              )}
              {!logsLoading && logs.length === 0 && (
                <div className="p-10 text-center text-sm text-muted-foreground">No matching log entries.</div>
              )}
              {!logsLoading &&
                logs.map((log) => (
                  <div key={log.id} className="grid grid-cols-[1fr_1fr_110px_140px_1fr] items-center gap-3 border-b p-4 text-sm last:border-b-0">
                    <div className="min-w-0">
                      {log.email_campaigns ? (
                        <Link to={`/communications/campaigns/${log.email_campaigns.id}`} className="truncate font-medium text-slate-950 hover:text-kolekto-orange">
                          {log.email_campaigns.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Deleted campaign</span>
                      )}
                      <p className="truncate text-xs text-muted-foreground">{log.email_campaigns?.subject || "—"}</p>
                    </div>
                    <div className="truncate">{log.email}</div>
                    <div>
                      <Badge variant="outline" className={STATUS_STYLES[log.status] || ""}>
                        {log.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{log.sent_at ? formatDateTime(log.sent_at) : `Queued ${formatDateTime(log.queued_at)}`}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {log.status === "failed" || log.status === "bounced" ? log.failed_reason || "—" : log.retry_count > 0 ? `${log.retry_count} retr${log.retry_count === 1 ? "y" : "ies"}` : ""}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>Page {page + 1} of {totalPages} ({logsTotal} results)</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="flex justify-end">
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {analyticsLoading || !analytics ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-kolekto-orange" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile label="Sent" value={analytics.totals.sent} />
                <StatTile label="Delivered" value={analytics.totals.delivered} />
                <StatTile label="Opened" value={analytics.totals.opened} accent={SERIES_COLOR.opened} />
                <StatTile label="Clicked" value={analytics.totals.clicked} accent={SERIES_COLOR.clicked} />
                <StatTile label="Failed" value={analytics.totals.failed} accent="#d03b3b" />
                <StatTile label="Open Rate" value={`${analytics.rates.openRate}%`} />
                <StatTile label="Click-through Rate" value={`${analytics.rates.clickThroughRate}%`} />
                <StatTile label="Bounce Rate" value={`${analytics.rates.bounceRate}%`} accent={analytics.rates.bounceRate > 5 ? "#d03b3b" : undefined} />
              </div>

              <Card>
                <CardContent className="p-4">
                  <p className="mb-4 text-sm font-semibold text-slate-950">Daily activity</p>
                  {analytics.trend.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">No activity in this date range yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={analytics.trend} margin={{ top: 4, right: 12, left: -12, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#898781" }} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#898781" }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: 8, border: "1px solid #e1e0d9", fontSize: 13 }}
                          labelStyle={{ color: "#0b0b0b", fontWeight: 600 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 13 }} />
                        <Line type="monotone" dataKey="sent" name="Sent" stroke={SERIES_COLOR.sent} strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="opened" name="Opened" stroke={SERIES_COLOR.opened} strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="clicked" name="Clicked" stroke={SERIES_COLOR.clicked} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-bold" style={accent ? { color: accent } : { color: "#0b0b0b" }}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
