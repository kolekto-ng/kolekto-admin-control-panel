import { useEffect, useState } from "react";
import type React from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  BarChart3,
  CircleDollarSign,
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

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    axiosInstance
      .get(`/adminurlabdkole/ambassadors/applications/${id}/detail`)
      .then(({ data }) => setDetail(data))
      .catch((error) => {
        toast.error(error?.response?.data?.error || "Failed to load ambassador detail");
      })
      .finally(() => setLoading(false));
  }, [id]);

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
        </TabsContent>

        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>Ambassador Payout Accounts</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                emptyText="No payout account has been connected for this ambassador yet."
                headers={["Bank", "Account", "Last 4", "Default", "Status"]}
                rows={accounts.map((account) => [
                  account.bank_name || "-",
                  account.account_name || "-",
                  account.account_last4 || "-",
                  account.is_default ? "Yes" : "No",
                  account.status || "-",
                ])}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals">
          <Card>
            <CardHeader>
              <CardTitle>Ambassador Withdrawals</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                emptyText="No ambassador withdrawal has been requested yet."
                headers={["Amount", "Status", "Requested", "Processed", "Notes"]}
                rows={withdrawals.map((withdrawal) => [
                  formatCurrency(withdrawal.amount || 0),
                  withdrawal.status || "-",
                  withdrawal.requested_at ? formatDate(withdrawal.requested_at) : "-",
                  withdrawal.processed_at ? formatDate(withdrawal.processed_at) : "-",
                  withdrawal.admin_notes || "-",
                ])}
              />
            </CardContent>
          </Card>
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
