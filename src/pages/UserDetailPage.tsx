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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useUsersStore } from "@/stores/usersStore";
import { useCollectionsStore } from "@/stores/collectionsStore";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/formatters";

interface UserStats {
  availableBalance: number;
  accountBalance: number;
  totalWithdrawn: number;
  pendingWithdrawal: number;
  pendingBalance: number;
}

interface ActivityLogItem {
  id: string;
  type: "collection_created" | "withdrawal_request" | "account_created";
  description: string;
  date: string;
}

const UserDetailPage = () => {
  const { id } = useParams();
  const [user, setUser] = useState<any>(null);
  const [collections, setCollections] = useState<any[]>([]);
  const [stats, setStats] = useState<UserStats>({
    availableBalance: 0,
    accountBalance: 0,
    totalWithdrawn: 0,
    pendingWithdrawal: 0,
    pendingBalance: 0,
  });
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { getUserById, fetchUsers } = useUsersStore();
  const { fetchCollections, collections: allCollections } = useCollectionsStore();

  const loadData = useCallback(async () => {
    if (!id) return;

    try {
      // Ensure users are loaded
      let foundUser = getUserById(id);
      if (!foundUser) {
        await fetchUsers();
        foundUser = getUserById(id);
      }

      if (foundUser) {
        setUser(foundUser);

        // 1. Fetch User's Collections
        const { data: userCollections } = await supabase
          .from("collections")
          .select("*")
          .eq("user_id", id)
          .order("created_at", { ascending: false });

        setCollections(userCollections || []);

        // 2. Fetch User's Wallets (via collections) to get Balance
        let availableBalance = 0;
        let ledgerBalance = 0;

        if (userCollections && userCollections.length > 0) {
          const collectionIds = userCollections.map((c) => c.id);
          const { data: wallets } = await supabase
            .from("wallets")
            .select("available_balance, ledger_balance")
            .in("collection_id", collectionIds);

          if (wallets) {
            wallets.forEach((w) => {
              availableBalance += w.available_balance || 0;
              ledgerBalance += w.ledger_balance || 0;
            });
          }
        }

        // 3. Fetch User's Withdrawals to get Pending & Total Withdrawn
        // We rely on the withdrawals table for accurate 'Total Withdrawn' history
        let pendingWithdrawal = 0;
        let totalWithdrawn = 0; // Calculated from approved withdrawals
        let approvedButNotLedgerDeducted = 0; // Track approved amounts to subtract from pending balance
        let userWithdrawals: any[] = [];

        if (userCollections && userCollections.length > 0) {
          const collectionIds = userCollections.map((c) => c.id);
          const { data: withdrawalData } = await supabase
            .from("withdrawals")
            .select("*")
            .in("collection_id", collectionIds)
            .order("created_at", { ascending: false });

          userWithdrawals = withdrawalData || [];

          userWithdrawals.forEach((w) => {
            if (w.status === "pending") {
              pendingWithdrawal += w.amount;
            } else if (w.status === "approved" || w.status === "success" || w.status === "paid") {
              totalWithdrawn += w.amount;
              // Assuming 'approved' transactions haven't reduced the ledger balance yet,
              // we treat them as 'locked' funds similar to pending withdrawals.
              if (w.status === "approved") {
                approvedButNotLedgerDeducted += w.amount;
              }
            }
          });
        }

        // Calculate Pending Balance (Incoming Funds)
        // Ledger - Available includes: "Incoming Pending" + "Pending Withdrawals" + "Approved (Processing) Withdrawals"
        // So Incoming = (Ledger - Available) - PendingWithdrawal - ApprovedWithdrawals(Processing)
        let pendingBalance = Math.max(0, (ledgerBalance - availableBalance) - pendingWithdrawal - approvedButNotLedgerDeducted);

        // Account Balance = Available + Pending (Incoming)
        let accountBalance = availableBalance + pendingBalance;

        setStats({
          availableBalance,
          accountBalance,
          totalWithdrawn,
          pendingWithdrawal,
          pendingBalance,
        });

        // 4. Generate Activity Log
        const logs: ActivityLogItem[] = [];

        // Account Created
        if (foundUser.joinDate) {
          logs.push({
            id: "join-" + id,
            type: "account_created",
            description: "Account created",
            date: foundUser.joinDate,
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
  }, [id, getUserById, fetchUsers]);

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
              <div className="mt-1">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
              </div>
            </div>

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
