import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { axiosInstance } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/formatters";

type Withdrawal = {
  id: string;
  ambassador_id: string;
  payout_account_id: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "paid";
  admin_notes?: string;
  requested_at?: string;
  processed_at?: string;
  created_at: string;
  ambassador_profiles?: {
    id: string;
    full_name: string;
    email: string;
    ambassador_code: string;
    total_earnings?: number;
    pending_earnings?: number;
    available_earnings?: number;
  };
  ambassador_payout_accounts?: {
    bank_name: string;
    account_name: string;
    account_last4: string;
    account_number?: string | null;
  };
};

const STATUS_OPTIONS = ["all", "pending", "approved", "rejected", "paid"] as const;
const PAGE_SIZE = 20;

const statusColors: Record<string, string> = {
  paid: "border-green-200 bg-green-50 text-green-700",
  approved: "border-blue-200 bg-blue-50 text-blue-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
};

export default function AmbassadorWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sortField, setSortField] = useState<"created_at" | "amount">("created_at");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | "pay" | null>(null);

  const loadWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      const { data } = await axiosInstance.get("/adminurlabdkole/ambassadors/withdrawals", { params });
      setWithdrawals(data.withdrawals || []);
      setPage(1);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to load ambassador withdrawals");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadWithdrawals();
  }, [loadWithdrawals]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let result = withdrawals;
    if (needle) {
      result = result.filter((w) => {
        const profile = w.ambassador_profiles;
        const account = w.ambassador_payout_accounts;
        return [
          profile?.full_name,
          profile?.ambassador_code,
          profile?.email,
          account?.bank_name,
          account?.account_name,
          String(w.amount),
        ].some((v) => v?.toLowerCase().includes(needle));
      });
    }
    result = [...result].sort((a, b) => {
      const va = sortField === "amount" ? Number(a.amount) : new Date(a.created_at).getTime();
      const vb = sortField === "amount" ? Number(b.amount) : new Date(b.created_at).getTime();
      return sortDir === "desc" ? vb - va : va - vb;
    });
    return result;
  }, [withdrawals, query, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const summaries = useMemo(() => ({
    pending: withdrawals.filter((w) => w.status === "pending").length,
    approved: withdrawals.filter((w) => w.status === "approved").length,
    paid: withdrawals.filter((w) => w.status === "paid").reduce((s, w) => s + Number(w.amount), 0),
    total: withdrawals.reduce((s, w) => s + Number(w.amount), 0),
  }), [withdrawals]);

  async function runAction(id: string, action: "approve" | "reject" | "pay", notes: string) {
    setActionLoading(id);
    try {
      await axiosInstance.patch(`/adminurlabdkole/ambassadors/withdrawals/${id}`, { action, notes });
      const label = action === "pay" ? "marked as paid" : `${action}d`;
      toast.success(`Withdrawal ${label} successfully.`);
      setExpandedId(null);
      setActionNotes("");
      setActionType(null);
      await loadWithdrawals();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || `Failed to ${action} withdrawal.`);
    } finally {
      setActionLoading(null);
    }
  }

  function toggleAction(id: string, action: "approve" | "reject" | "pay") {
    if (expandedId === id && actionType === action) {
      setExpandedId(null);
      setActionType(null);
      setActionNotes("");
    } else {
      setExpandedId(id);
      setActionType(action);
      setActionNotes("");
    }
  }

  function toggleSort(field: "created_at" | "amount") {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">Ambassador operations</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Withdrawal Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review, approve, reject, and pay ambassador withdrawal requests.</p>
        </div>
        <Button onClick={loadWithdrawals} variant="outline" disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Pending Approval" value={String(summaries.pending)} highlight={summaries.pending > 0} />
        <SummaryCard label="Approved (Queued)" value={String(summaries.approved)} />
        <SummaryCard label="Total Paid Out" value={formatCurrency(summaries.paid)} />
        <SummaryCard label="All Requests (Volume)" value={formatCurrency(summaries.total)} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                placeholder="Search by name, code, bank, amount…"
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-white px-3 text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button size="sm" variant={sortField === "created_at" ? "default" : "outline"} onClick={() => toggleSort("created_at")} className="text-xs">
                Date {sortField === "created_at" ? (sortDir === "desc" ? "↓" : "↑") : ""}
              </Button>
              <Button size="sm" variant={sortField === "amount" ? "default" : "outline"} onClick={() => toggleSort("amount")} className="text-xs">
                Amount {sortField === "amount" ? (sortDir === "desc" ? "↓" : "↑") : ""}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            {filtered.length} withdrawal{filtered.length !== 1 ? "s" : ""}
            {statusFilter !== "all" ? ` · ${statusFilter}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-green-700" />
            </div>
          )}
          {!loading && paginated.length === 0 && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {query ? "No withdrawals match your search." : "No withdrawal requests yet."}
            </div>
          )}
          {!loading && paginated.map((w) => {
            const profile = w.ambassador_profiles;
            const account = w.ambassador_payout_accounts;
            const isExpanded = expandedId === w.id;
            const isActing = actionLoading === w.id;
            const canApprove = w.status === "pending";
            const canPay = w.status === "approved";
            const canReject = w.status === "pending" || w.status === "approved";

            return (
              <div key={w.id} className="border-b last:border-b-0">
                <div className="grid gap-3 p-4 text-sm md:grid-cols-[1fr_140px_160px_150px_130px_auto]">
                  {/* Ambassador */}
                  <div>
                    {profile ? (
                      <Link
                        to={`/ambassadors/${w.ambassador_id}`}
                        className="font-semibold text-slate-950 hover:text-green-700"
                      >
                        {profile.full_name}
                      </Link>
                    ) : (
                      <p className="font-semibold text-slate-950">Ambassador</p>
                    )}
                    {profile && (
                      <p className="text-xs text-muted-foreground">{profile.ambassador_code} · {profile.email}</p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {w.requested_at ? formatDate(w.requested_at) : formatDate(w.created_at)}
                    </p>
                  </div>

                  {/* Amount */}
                  <div>
                    <p className="font-semibold text-slate-950">{formatCurrency(w.amount)}</p>
                    {w.processed_at && (
                      <p className="text-xs text-muted-foreground">Processed {formatDate(w.processed_at)}</p>
                    )}
                  </div>

                  {/* Bank — full account number shown to admin */}
                  <div>
                    {account ? (
                      <>
                        <p className="font-medium">{account.bank_name}</p>
                        <p className="text-xs text-muted-foreground">{account.account_name}</p>
                        <p className="mt-0.5 font-mono text-xs font-semibold text-slate-700">
                          {account.account_number || `****${account.account_last4}`}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">No account</p>
                    )}
                  </div>

                  {/* Earnings — helps the admin judge the request in context */}
                  <div className="text-xs">
                    {profile ? (
                      <>
                        <p className="text-slate-950">
                          <span className="text-muted-foreground">Available</span>{" "}
                          <span className="font-semibold">{formatCurrency(profile.available_earnings ?? 0)}</span>
                        </p>
                        <p className="mt-0.5 text-muted-foreground">
                          Total {formatCurrency(profile.total_earnings ?? 0)}
                        </p>
                        <p className="text-muted-foreground">
                          Pending {formatCurrency(profile.pending_earnings ?? 0)}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">—</p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex items-start">
                    <Badge variant="outline" className={statusColors[w.status] || ""}>{w.status}</Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-start gap-2">
                    {canApprove && (
                      <Button size="sm" variant="outline" className="border-green-200 text-green-700 hover:bg-green-50 text-xs"
                        onClick={() => toggleAction(w.id, "approve")}>
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Approve
                      </Button>
                    )}
                    {canPay && (
                      <Button size="sm" className="bg-green-900 text-white hover:bg-green-800 text-xs"
                        onClick={() => toggleAction(w.id, "pay")}>
                        Mark Paid
                      </Button>
                    )}
                    {canReject && (
                      <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 text-xs"
                        onClick={() => toggleAction(w.id, "reject")}>
                        <XCircle className="mr-1 h-3 w-3" /> Reject
                      </Button>
                    )}
                  </div>
                </div>

                {/* Admin notes display */}
                {w.admin_notes && !isExpanded && (
                  <div className="border-t border-slate-50 bg-slate-50 px-4 py-2 text-xs text-slate-500">
                    Notes: {w.admin_notes}
                  </div>
                )}

                {/* Inline action form */}
                {isExpanded && actionType && (
                  <div className="border-t border-slate-100 bg-slate-50 p-4">
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      {actionType === "approve" ? "Approve withdrawal" : actionType === "pay" ? "Mark as paid" : "Reject withdrawal"} — notes (optional)
                    </p>
                    <Input
                      placeholder="Admin notes or remarks..."
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      className="bg-white"
                    />
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        disabled={isActing}
                        onClick={() => runAction(w.id, actionType, actionNotes)}
                        className={actionType === "reject" ? "bg-red-700 text-white hover:bg-red-600" : "bg-green-900 text-white hover:bg-green-800"}
                      >
                        {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setExpandedId(null); setActionType(null); setActionNotes(""); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>Page {page} of {totalPages} ({filtered.length} results)</p>
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
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-amber-200 bg-amber-50" : ""}>
      <CardContent className="p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-2 text-xl font-bold ${highlight ? "text-amber-700" : "text-slate-950"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
