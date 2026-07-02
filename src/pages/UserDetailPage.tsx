import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
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
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { axiosInstance } from "@/lib/axios";
import { formatCurrency, formatDate } from "@/lib/formatters";

interface UserStats {
  availableBalance: number;
  accountBalance: number;
  totalWithdrawn: number;
  pendingWithdrawal: number;
  pendingBalance: number;
  totalRaised: number;
}

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
  const [user, setUser] = useState<any>(null);
  const [collections, setCollections] = useState<any[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<string>('unverified');
  const [stats, setStats] = useState<UserStats>({
    availableBalance: 0,
    accountBalance: 0,
    totalWithdrawn: 0,
    pendingWithdrawal: 0,
    pendingBalance: 0,
    totalRaised: 0,
  });
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const loadData = useCallback(async () => {
    if (!id) return;

    try {
      // Fetch User's Profile with nested collections, wallets, withdrawals, and KYC status (single consolidated query)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          phone_number,
          created_at,
          kyc_verifications(status),
          collections(
            id,
            title,
            status,
            created_at,
            wallets(
              net_payment,
              available_balance,
              pending_balance,
              ledger_balance,
              updated_at,
              created_at
            ),
            withdrawals(
              id,
              amount,
              status,
              created_at
            )
          )
        `)
        .eq("id", id)
        .single();

      if (profileError) throw profileError;

      if (profileData) {
        setUser({
          id: profileData.id,
          name: profileData.full_name || "Unknown User",
          email: profileData.email || "",
          phone: profileData.phone_number || "",
          joinDate: profileData.created_at || "",
        });

        // Extract KYC verification status
        let kycStatus = "unverified";
        if (profileData.kyc_verifications) {
          if (Array.isArray(profileData.kyc_verifications)) {
            if (profileData.kyc_verifications.length > 0) {
              kycStatus = profileData.kyc_verifications[0]?.status || "unverified";
            }
          } else {
            kycStatus = (profileData.kyc_verifications as any).status || "unverified";
          }
        }
        setVerificationStatus(kycStatus);

        const userCollections = profileData.collections || [];
        setCollections(userCollections);

        // Calculate Stats and extract Withdrawals client-side
        let availableBalance = 0;
        let ledgerBalance = 0;
        let pendingBalance = 0;
        let netPayment = 0; // Total Raised across all user's collections
        let pendingWithdrawal = 0;
        let totalWithdrawn = 0; // Calculated from approved withdrawals
        let approvedButNotLedgerDeducted = 0;
        const userWithdrawals: any[] = [];

        userCollections.forEach((collection: any) => {
          // 1. Process Wallets
          const walletList = collection.wallets;
          let selectedWallet = null;
          if (walletList) {
            if (Array.isArray(walletList)) {
              if (walletList.length > 0) {
                selectedWallet = [...walletList].sort((a, b) => 
                  new Date(b.updated_at || b.created_at || 0).getTime() - 
                  new Date(a.updated_at || a.created_at || 0).getTime()
                )[0];
              }
            } else {
              selectedWallet = walletList;
            }
          }
          if (selectedWallet) {
            availableBalance += Number(selectedWallet.available_balance || 0);
            ledgerBalance += Number(selectedWallet.ledger_balance || 0);
            pendingBalance += Number(selectedWallet.pending_balance || 0);
            netPayment += Number(selectedWallet.net_payment || 0);
          }

          // 2. Process Withdrawals
          const collectionWithdrawals = collection.withdrawals;
          if (Array.isArray(collectionWithdrawals)) {
            collectionWithdrawals.forEach((w: any) => {
              const withdrawalWithCol = { ...w, collection_id: collection.id };
              userWithdrawals.push(withdrawalWithCol);

              if (w.status === "pending") {
                pendingWithdrawal += w.amount;
              } else if (w.status === "approved" || w.status === "success" || w.status === "paid") {
                totalWithdrawn += w.amount;
                if (w.status === "approved") {
                  approvedButNotLedgerDeducted += w.amount;
                }
              }
            });
          }
        });

        // Sort withdrawals newest first
        userWithdrawals.sort((a, b) => 
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );

        const accountBalance = ledgerBalance; // Total Balance = available + pending
        void approvedButNotLedgerDeducted; // tracked but not used for balance math

        // Prefer the live, server-recomputed account snapshot. The summed
        // cached `wallets` columns above over-report whenever a withdrawal was
        // approved before the recompute-on-approval logic existed (and the
        // collection has had no activity since) — the cached ledger still holds
        // money that has already left the wallet. The live endpoint reuses the
        // exact pooled computeWalletBalances() the host dashboard uses, so admin
        // and host always agree. Best-effort: fall back to the cached sums if
        // the backend is unreachable, so the page never breaks.
        let liveStats: any = null;
        try {
          const { data: live } = await axiosInstance.get(
            `/adminurlabdkole/users/${id}/wallet-live`,
          );
          if (live && typeof live.totalBalance === "number") {
            liveStats = live;
          }
        } catch (liveErr) {
          console.warn(
            "Live account wallet fetch failed — falling back to cached wallet columns:",
            liveErr,
          );
        }

        setStats({
          availableBalance: liveStats
            ? Number(liveStats.availableBalance || 0)
            : availableBalance,
          accountBalance: liveStats
            ? Number(liveStats.totalBalance || 0)
            : accountBalance,
          // `withdrawn` from the live endpoint is the canonical completed-
          // withdrawals figure (computeWalletBalances); keep the existing
          // client tally as the fallback.
          totalWithdrawn: liveStats
            ? Number(liveStats.withdrawn ?? totalWithdrawn)
            : totalWithdrawn,
          pendingWithdrawal: liveStats
            ? Number(liveStats.pendingWithdrawalRequests ?? pendingWithdrawal)
            : pendingWithdrawal,
          pendingBalance: liveStats
            ? Number(liveStats.pendingBalance || 0)
            : pendingBalance,
          totalRaised: liveStats
            ? Number(liveStats.totalRaised || 0)
            : netPayment,
        });

        // 4. Generate Activity Log
        const logs: ActivityLogItem[] = [];

        // Account Created
        if (profileData.created_at) {
          logs.push({
            id: "join-" + id,
            type: "account_created",
            description: "Account created",
            date: profileData.created_at,
          });
        }

        // Collection Created events
        userCollections?.forEach((c) => {
          logs.push({
            id: "col-" + c.id,
            type: "collection_created",
            description: `Created collection "${c.title}"`,
            date: c.created_at,
          });
        });

        // Withdrawal requests
        userWithdrawals.forEach((w) => {
          logs.push({
            id: "with-" + w.id,
            type: "withdrawal_request",
            description: `Requested withdrawal of ${formatCurrency(w.amount)}`,
            date: w.created_at,
          });
        });

        // Sort logs newest first
        logs.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setActivityLog(logs);
      }
    } catch (error) {
      console.error("Failed to load user details:", error);
      toast({
        title: "Error",
        description: "Failed to load user details.",
        variant: "destructive",
      });
    } finally {
      if (loading) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Initial load
    setLoading(true);
    loadData();

    // Setup Realtime Subscription
    const channel = supabase
      .channel('user-details-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallets' },
        (payload) => {
          console.log('Wallet changed, reloading...', payload);
          loadData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'withdrawals' },
        (payload) => {
          console.log('Withdrawal changed, reloading...', payload);
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading user data...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold">User not found</h2>
        <Button asChild className="mt-4">
          <Link to="/users">Back to Users</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/users">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">User Details</h1>
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
