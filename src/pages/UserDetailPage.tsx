import { useEffect, useMemo, useRef } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  Wallet,
  Clock,
  ArrowUpRight,
  Hourglass,
  ShieldCheck,
  ShieldOff,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useUserDetail, useUserWalletLive } from "@/features/users/queries";
import { qk } from "@/lib/queryKeys";
import { RefreshingIndicator } from "@/components/ui/table-skeleton";

interface ActivityLogItem {
  id: string;
  type: "collection_created" | "withdrawal_request" | "account_created";
  description: string;
  date: string;
}

const VERIFICATION_BADGES: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
  verified: { label: 'Verified', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  pending: { label: 'KYC Pending', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  reviewing: { label: 'KYC Reviewing', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: ShieldCheck },
  rejected: { label: 'KYC Rejected', className: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  unverified: { label: 'Unverified', className: 'bg-gray-100 text-gray-500 border-gray-200', icon: ShieldOff },
};

const UserDetailPage = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const location = useLocation();
  const queryClient = useQueryClient();

  // The Users list passes its query string along when the row is clicked, so
  // Back returns to the exact page/search/filter the admin left — rather than
  // to a bare /users that would re-render page 1 of the unfiltered list.
  const backTo = `/users${(location.state as { from?: string } | null)?.from ?? ""}`;

  // Two independent queries running in parallel. Previously the profile read
  // and the live wallet call were awaited one after the other inside a single
  // loadData(), so the page could not paint until the slower of the two — plus
  // the faster one — had completed in sequence.
  const {
    data: detail,
    isPending,
    isError,
    error,
    isPlaceholderData,
    isFetching,
  } = useUserDetail(id);
  const { data: liveStats } = useUserWalletLive(id);

  useEffect(() => {
    if (isError) {
      console.error("Failed to load user details:", error);
      toast({
        title: "Error",
        description: "Failed to load user details.",
        variant: "destructive",
      });
    }
  }, [isError, error, toast]);

  // ───────────────────────────────────────────────────────────────────────────
  // REALTIME
  //
  // This page used to subscribe to *every* row change on `wallets` and
  // `withdrawals` platform-wide and re-run the entire load on each one. Any
  // contribution by any user anywhere refetched this page. The subscription is
  // kept (admins do want live balances) but it now checks the payload against
  // this user's collections first, and invalidates the two relevant query keys
  // instead of imperatively refetching — so an unrelated event costs nothing
  // and a relevant one flows through the same cache path as everything else.
  // ───────────────────────────────────────────────────────────────────────────
  const collectionIds = useMemo(
    () => new Set((detail?.collections ?? []).map((c: { id: string }) => c.id)),
    [detail?.collections],
  );
  const collectionIdsRef = useRef(collectionIds);
  collectionIdsRef.current = collectionIds;

  useEffect(() => {
    if (!id) return;

    const isRelevant = (payload: { new?: unknown; old?: unknown }) => {
      const row = (payload.new ?? payload.old) as
        | { collection_id?: string; user_id?: string }
        | undefined;
      if (!row) return false;
      if (row.user_id && row.user_id === id) return true;
      return Boolean(
        row.collection_id && collectionIdsRef.current.has(row.collection_id),
      );
    };

    const refresh = (payload: { new?: unknown; old?: unknown }) => {
      if (!isRelevant(payload)) return;
      queryClient.invalidateQueries({ queryKey: qk.users.detail(id) });
      queryClient.invalidateQueries({ queryKey: qk.users.wallet(id) });
    };

    const channel = supabase
      .channel(`user-details-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "withdrawals" },
        refresh,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  const user = detail ?? null;
  const collections = detail?.collections ?? [];
  const verificationStatus = detail?.verificationStatus ?? "unverified";

  // Prefer the live, server-recomputed snapshot; fall back to the summed cached
  // wallet columns when the backend is unreachable, exactly as before.
  const stats = useMemo(() => {
    const cached = detail?.cachedTotals;
    return {
      availableBalance: liveStats?.availableBalance ?? cached?.availableBalance ?? 0,
      accountBalance: liveStats?.accountBalance ?? cached?.accountBalance ?? 0,
      totalWithdrawn: liveStats?.totalWithdrawn ?? cached?.totalWithdrawn ?? 0,
      pendingWithdrawal: liveStats?.pendingWithdrawal ?? cached?.pendingWithdrawal ?? 0,
      pendingBalance: liveStats?.pendingBalance ?? cached?.pendingBalance ?? 0,
      totalRaised: liveStats?.totalRaised ?? cached?.totalRaised ?? 0,
    };
  }, [detail?.cachedTotals, liveStats]);

  const activityLog = useMemo<ActivityLogItem[]>(() => {
    if (!detail) return [];
    const logs: ActivityLogItem[] = [];

    if (detail.joinDate) {
      logs.push({
        id: "join-" + detail.id,
        type: "account_created",
        description: "Account created",
        date: detail.joinDate,
      });
    }

    for (const c of detail.collections ?? []) {
      logs.push({
        id: "col-" + c.id,
        type: "collection_created",
        description: `Created collection "${c.title}"`,
        date: c.created_at,
      });
    }

    for (const w of detail.withdrawals ?? []) {
      logs.push({
        id: "with-" + w.id,
        type: "withdrawal_request",
        description: `Requested withdrawal of ${formatCurrency(w.amount)}`,
        date: w.created_at,
      });
    }

    logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return logs;
  }, [detail]);

  // Only a genuine cold start blocks. Arriving from the Users list seeds the
  // header from the cached row (isPlaceholderData), so the identity fields
  // render on the first frame while the financial detail streams in behind.
  if (isPending && !detail) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-7 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[420px] md:col-span-1" />
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold">User not found</h2>
        <Button asChild className="mt-4">
          <Link to={backTo}>Back to Users</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to={backTo}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">User Details</h1>
          {/* Placeholder data means the header came from the cached list row and
              the full record is still in flight — say so quietly rather than
              hiding the page behind a spinner. */}
          <RefreshingIndicator show={isPlaceholderData || isFetching} />
        </div>
        <div className="flex space-x-2">
          {/* Actions could go here */}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Profile Card */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                <UserIcon size={40} className="text-gray-500" />
              </div>
            </div>

            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">{user.name}</h3>
              <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                {(() => {
                  const cfg = VERIFICATION_BADGES[verificationStatus] || VERIFICATION_BADGES['unverified'];
                  const Icon = cfg.icon;
                  return (
                    <Badge variant="outline" className={`text-xs font-medium ${cfg.className}`}>
                      <Icon className="h-3 w-3 mr-1" />
                      {cfg.label}
                    </Badge>
                  );
                })()}
              </div>
            </div>

            {/* View KYC Button */}
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link to={`/kyc/${user.id}`}>
                <ShieldCheck className="h-4 w-4 mr-1.5" />
                View KYC Details
              </Link>
            </Button>

            <div className="space-y-3">
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{user.email}</span>
              </div>
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{user.phone || "No phone"}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                <span className="text-sm">
                  Joined {user.joinDate ? formatDate(user.joinDate) : "N/A"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats and Tabs */}
        <div className="md:col-span-2 space-y-6">
          {/* Financial Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Account Balance
                  </p>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.accountBalance)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Available Balance
                  </p>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.availableBalance)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Pending Balance
                  </p>
                  <Hourglass className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.pendingBalance)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Withdrawn
                  </p>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.totalWithdrawn)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Pending Withdrawal
                  </p>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.pendingWithdrawal)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="collections">
            <TabsList className="mb-4">
              <TabsTrigger value="collections">
                Collections ({collections.length})
              </TabsTrigger>
              <TabsTrigger value="activity">Activity Log</TabsTrigger>
            </TabsList>

            <TabsContent value="collections">
              <Card>
                <CardContent className="p-0">
                  {collections.length > 0 ? (
                    <table className="w-full data-table">
                      <thead>
                        <tr>
                          <th className="text-left p-4">Collection</th>
                          <th className="text-left p-4">Status</th>
                          <th className="text-left p-4">Created</th>
                          <th className="text-left p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {collections.map((collection) => (
                          <tr key={collection.id} className="border-t">
                            <td className="p-4 font-medium">
                              {collection.title}
                            </td>
                            <td className="p-4">
                              <Badge variant="secondary">
                                {collection.status}
                              </Badge>
                            </td>
                            <td className="p-4">
                              {formatDate(collection.created_at)}
                            </td>
                            <td className="p-4">
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/collections/${collection.id}`}>
                                  View
                                </Link>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-muted-foreground">
                        No collections created by this user.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardContent className="pt-6">
                  {activityLog.length > 0 ? (
                    <ul className="space-y-4">
                      {activityLog.map((log) => (
                        <li key={log.id} className="flex items-start">
                          <div
                            className={`w-2 h-2 rounded-full mt-2 mr-3 ${log.type === "account_created"
                              ? "bg-green-500"
                              : log.type === "collection_created"
                                ? "bg-blue-500"
                                : "bg-orange-500"
                              }`}
                          ></div>
                          <div>
                            <p className="text-sm">{log.description}</p>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(log.date)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-center text-muted-foreground">
                      No activity recorded.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default UserDetailPage;
