
import { useEffect, useState } from "react";
import type React from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  BarChart3,
  CircleDollarSign,
  ExternalLink,
  Loader2,
  ShieldCheck,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { axiosInstance } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/formatters";

type AmbassadorDetail = {
  application?: any;
  profile?: any;
  metrics?: any;
  organizers?: any[];
  ambassadorPayoutAccounts?: any[];
  ambassadorWithdrawals?: any[];
};

export default function AmbassadorDetailPage() {
  const { id } = useParams();
  const [detail, setDetail] = useState<AmbassadorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [linkEmail, setLinkEmail] = useState("");
  const [linking, setLinking] = useState(false);

  const loadDetail = () => {
    if (!id) return;
    axiosInstance
      .get(`/adminurlabdkole/ambassadors/applications/${id}/detail`)
      .then(({ data }) => setDetail(data))
      .catch((error) => {
        toast.error(error?.response?.data?.error || "Failed to load ambassador detail");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    loadDetail();
  }, [id]);

  async function handleLinkOrganizer(e: React.FormEvent) {
    e.preventDefault();
    const email = linkEmail.trim().toLowerCase();
    if (!email || !id) return;
    setLinking(true);
    try {
      const { data } = await axiosInstance.post(`/adminurlabdkole/ambassadors/${id}/link-organizer`, {
        organizer_email: email,
      });
      toast.success(data.message || "Organizer linked successfully.");
      setLinkEmail("");
      loadDetail();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to link organizer.");
    } finally {
      setLinking(false);
    }
  }

  async function handleWithdrawalAction(withdrawalId: string, action: "approve" | "reject" | "pay", notes: string) {
    setActionLoading(withdrawalId);
    try {
      await axiosInstance.patch(`/adminurlabdkole/ambassadors/withdrawals/${withdrawalId}`, { action, notes });
      const label = action === "pay" ? "marked as paid" : action + "d";
      toast.success(`Withdrawal ${label} successfully.`);
      loadDetail();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || `Failed to ${action} withdrawal.`);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        <span>Loading ambassador overview...</span>
      </div>
    );
  }

  if (!detail?.profile) {
    return (
      <div className="py-10 text-center">
        <h1 className="text-2xl font-bold">Ambassador profile not found</h1>
        <Button asChild className="mt-4">
          <Link to="/ambassadors">Back to Ambassadors</Link>
        </Button>
      </div>
    );
  }

  const profile = detail.profile;
  const metrics = detail.metrics || {};
  const organizers = detail.organizers || [];
  const accounts = detail.ambassadorPayoutAccounts || [];
  const withdrawals = detail.ambassadorWithdrawals || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/ambassadors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{profile.fullName}</h1>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {profile.status || "accepted"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.ambassadorCode} - {profile.rank || "Ambassador"} - {profile.email}
            </p>
          </div>
        </div>
        <div className="rounded-xl border bg-white px-4 py-3 text-sm">
          <span className="font-medium">PIN:</span> {profile.pinSet ? "Set" : "Not set"}
        </div>
      </div>

      <Card className="border-green-100 bg-green-50">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Ambassador Code</p>
            <p className="mt-2 text-2xl font-bold tracking-wide text-green-950">{profile.ambassadorCode}</p>
            <p className="mt-1 text-sm text-green-800">This code connects referred organizer accounts to this ambassador.</p>
          </div>
          <Badge variant="outline" className="w-fit border-green-200 bg-white text-green-800">
            {profile.pinSet ? "PIN set" : "PIN not set"}
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Organizers Referred" value={metrics.totalOrganizersInfluenced || 0} icon={Users} />
        <MetricCard label="Collections Influenced" value={metrics.totalCollectionsInfluenced || 0} icon={BarChart3} />
        <MetricCard label="Total Earnings" value={formatCurrency(metrics.totalEarnings || 0)} icon={CircleDollarSign} />
        <MetricCard label="Available Earnings" value={formatCurrency(metrics.availableEarnings || 0)} icon={ShieldCheck} />
        <MetricCard label="Pending Earnings" value={formatCurrency(metrics.pendingEarnings || 0)} icon={Wallet} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard label="Phone" value={detail.application?.phone_number || profile.phoneNumber || "-"} />
        <InfoCard label="Location" value={[profile.city, profile.state].filter(Boolean).join(", ") || "-"} />
        <InfoCard label="Activated" value={profile.activatedAt ? formatDate(profile.activatedAt) : "-"} />
      </div>

      <Tabs defaultValue="organizers">
        <TabsList className="mb-4">
          <TabsTrigger value="organizers">Referred Organizers</TabsTrigger>
          <TabsTrigger value="accounts">Connected Accounts</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>

        <TabsContent value="organizers">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Referred Organizers</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  emptyText="No organizers have registered with this ambassador code yet."
                  headers={["Organizer", "Collections", "Earnings", "Status", "Joined"]}
                  rows={organizers.map((organizer) => [
                    <div>
                      <p className="font-medium">{organizer.name}</p>
                      <p className="text-xs text-muted-foreground">{organizer.email || "-"}</p>
                    </div>,
                    organizer.collectionsInfluenced || organizer.collections?.length || 0,
                    formatCurrency(organizer.earningsGenerated || 0),
                    organizer.rewardStatus || "-",
                    organizer.joinedAt ? formatDate(organizer.joinedAt) : "-",
                  ])}
                />
              </CardContent>
            </Card>

            {/* Retroactive organizer attribution */}
            <Card className="border-amber-100 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-amber-900">Link Organizer Retroactively</CardTitle>
                <p className="text-sm text-amber-700">
                  Use this when an organizer was referred in person but registered without the referral link.
                  Linking sets the referral relationship and backfills all historical contribution earnings.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLinkOrganizer} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                      Organizer email address
                    </label>
                    <Input
                      type="email"
                      placeholder="organizer@example.com"
                      value={linkEmail}
                      onChange={(e) => setLinkEmail(e.target.value)}
                      required
                      className="bg-white"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={linking || !linkEmail.trim()}
                    className="bg-amber-700 text-white hover:bg-amber-600"
                  >
                    {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link Organizer"}
                  </Button>
                </form>
                <p className="mt-2 text-xs text-amber-600">
                  This action is reversible only via direct DB intervention. Verify the organizer email before linking.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>Ambassador Payout Accounts</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                emptyText="No payout account has been connected for this ambassador yet."
                headers={["Bank", "Account Holder", "Account Number", "Default", "Status"]}
                rows={accounts.map((account) => [
                  account.bankName || account.bank_name || "-",
                  account.accountName || account.account_name || "-",
                  account.accountNumber || (account.accountLast4 ? `****${account.accountLast4}` : account.account_last4 || "-"),
                  (account.isDefault ?? account.is_default) ? "Yes" : "No",
                  account.status || "-",
                ])}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals">
          <div className="space-y-4">
            {/* Payout summary — totals come from backend metrics (already accounting for in-flight requests) */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <PayoutSummaryCard
                label="Total Earnings"
                value={formatCurrency(metrics.totalEarnings || 0)}
              />
              <PayoutSummaryCard
                label="Pending (Locked)"
                value={formatCurrency(metrics.pendingEarnings || 0)}
              />
              <PayoutSummaryCard
                label="Available Balance"
                value={formatCurrency(metrics.availableEarnings || 0)}
                highlight
              />
              <PayoutSummaryCard
                label="Total Withdrawn"
                value={formatCurrency(metrics.totalWithdrawn || 0)}
              />
            </div>

            {/* Active payout account */}
            {accounts.length > 0 && (
              <Card className="border-green-100 bg-green-50">
                <CardContent className="p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-green-700">Primary Payout Account</p>
                  {(() => {
                    const primary = accounts.find((a: any) => a.isDefault ?? a.is_default) || accounts[0];
                    return (
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
                        <div className="flex items-center gap-2">
                          <Banknote className="h-4 w-4 text-green-700" />
                          <span className="font-semibold text-green-950">{primary.bankName || primary.bank_name}</span>
                        </div>
                        <span className="text-sm text-green-800">{primary.accountName || primary.account_name}</span>
                        <span className="font-mono text-sm font-semibold text-green-900">
                          {primary.accountNumber || `****${primary.accountLast4 || primary.account_last4}`}
                        </span>
                        <Badge variant="outline" className="w-fit border-green-200 bg-white text-green-800">{primary.status || "active"}</Badge>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Withdrawal rows */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Withdrawal History</CardTitle>
                <Button asChild size="sm" variant="outline" className="gap-2 text-xs">
                  <Link to="/ambassador-withdrawals">
                    <ExternalLink className="h-3 w-3" /> All Withdrawals
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {withdrawals.length === 0 && (
                  <p className="p-8 text-center text-sm text-muted-foreground">No withdrawal request has been made yet.</p>
                )}
                {withdrawals.map((withdrawal: any) => (
                  <WithdrawalRow
                    key={withdrawal.id}
                    withdrawal={withdrawal}
                    onAction={handleWithdrawalAction}
                    acting={actionLoading === withdrawal.id}
                  />
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Organizer Accounts Connected Through This Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {organizers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No connected organizer accounts yet.</p>
          ) : (
            organizers.map((organizer) => (
              <div key={organizer.id} className="rounded-xl border p-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-800">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{organizer.name}</p>
                      <p className="text-sm text-muted-foreground">{organizer.email || "-"}</p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {(organizer.connectedAccounts || []).length} payout account(s) - {(organizer.withdrawals || []).length} withdrawal(s)
                  </div>
                </div>
                {(organizer.connectedAccounts || []).length > 0 && (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {organizer.connectedAccounts.map((account: any) => (
                      <div key={account.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                        <Banknote className="mb-2 h-4 w-4 text-green-800" />
                        <p className="font-medium">{account.bank_name || "Bank account"}</p>
                        <p className="text-muted-foreground">{account.account_name || "-"} - ****{account.account_last4 || "----"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardContent className="p-5">
        <Icon className="mb-4 h-5 w-5 text-green-800" />
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 font-medium">{value}</p>
      </CardContent>
    </Card>
  );
}

function PayoutSummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-green-200 bg-green-50" : ""}>
      <CardContent className="p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-2 text-xl font-bold ${highlight ? "text-green-800" : "text-slate-950"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function WithdrawalRow({
  withdrawal,
  onAction,
  acting,
}: {
  withdrawal: any;
  onAction: (id: string, action: "approve" | "reject" | "pay", notes: string) => void;
  acting: boolean;
}) {
  const [expanded, setExpanded] = useState<"approve" | "reject" | "pay" | null>(null);
  const [notes, setNotes] = useState("");

  const canApprove = withdrawal.status === "pending";
  const canPay = withdrawal.status === "approved";
  const canReject = withdrawal.status === "pending" || withdrawal.status === "approved";

  const confirm = () => {
    if (!expanded) return;
    onAction(withdrawal.id, expanded, notes);
    setExpanded(null);
    setNotes("");
  };

  const toggle = (action: "approve" | "reject" | "pay") =>
    setExpanded((prev) => (prev === action ? null : action));

  return (
    <div className="p-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <p className="font-semibold">{formatCurrency(withdrawal.amount || 0)}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Requested: {withdrawal.requested_at ? formatDate(withdrawal.requested_at) : "—"}
            {withdrawal.processed_at ? ` · Processed: ${formatDate(withdrawal.processed_at)}` : ""}
          </p>
          {withdrawal.admin_notes && (
            <p className="mt-1 text-xs text-muted-foreground">Notes: {withdrawal.admin_notes}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={
              withdrawal.status === "paid"
                ? "border-green-200 bg-green-50 text-green-700"
                : withdrawal.status === "approved"
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : withdrawal.status === "rejected"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-slate-200 bg-slate-50 text-slate-700"
            }
          >
            {withdrawal.status}
          </Badge>
          {canApprove && (
            <Button
              size="sm"
              variant="outline"
              className="border-green-200 text-green-700 hover:bg-green-50"
              onClick={() => toggle("approve")}
            >
              Approve
            </Button>
          )}
          {canPay && (
            <Button
              size="sm"
              className="bg-green-900 text-white hover:bg-green-800"
              onClick={() => toggle("pay")}
            >
              Mark Paid
            </Button>
          )}
          {canReject && (
            <Button
              size="sm"
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => toggle("reject")}
            >
              Reject
            </Button>
          )}
        </div>
      </div>
      {expanded && (
        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="mb-2 text-sm font-medium text-slate-700">
            {expanded === "approve" ? "Approve withdrawal" : expanded === "pay" ? "Mark as paid" : "Reject withdrawal"} — add notes (optional)
          </p>
          <Input
            placeholder="Admin notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-white"
          />
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              disabled={acting}
              onClick={confirm}
              className={expanded === "reject" ? "bg-red-700 text-white hover:bg-red-600" : "bg-green-900 text-white hover:bg-green-800"}
            >
              {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setExpanded(null);
                setNotes("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DataTable({ headers, rows, emptyText }: { headers: string[]; rows: React.ReactNode[][]; emptyText: string }) {
  if (rows.length === 0) {
    return <div className="p-8 text-center text-sm text-muted-foreground">{emptyText}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50">
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 text-left font-semibold text-slate-700">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b last:border-b-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 align-top">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
