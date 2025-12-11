import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Link } from 'react-router-dom';
import { useWithdrawalsStore } from '@/stores/withdrawalsStore';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const WithdrawalsPage = () => {
  const { withdrawals, loading, error, fetchWithdrawals, approveWithdrawal, rejectWithdrawal } = useWithdrawalsStore();
  const [filteredWithdrawals, setFilteredWithdrawals] = useState(withdrawals);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  console.log('Withdrawals:', withdrawals);


  useEffect(() => {
    let filtered = withdrawals;

    // Apply tab filter
    if (currentTab !== 'all') {
      filtered = filtered.filter(withdrawal => withdrawal.status === currentTab);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(withdrawal =>
        withdrawal.collectionName?.toLowerCase().includes(term) ||
        withdrawal.hostName.toLowerCase().includes(term) ||
        withdrawal.hostEmail.toLowerCase().includes(term)
      );
    }

    setFilteredWithdrawals(filtered);
  }, [searchTerm, currentTab, withdrawals]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-status-pending/15 text-status-pending">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-status-success/15 text-status-success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-status-error/15 text-status-error">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="bg-muted/80 text-muted-foreground">{status}</Badge>;
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await approveWithdrawal(id);
      toast({
        title: "Withdrawal Approved",
        description: `Withdrawal request has been approved.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve withdrawal request.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await rejectWithdrawal(id);
      toast({
        title: "Withdrawal Rejected",
        description: `Withdrawal request has been rejected.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject withdrawal request.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getTabCount = (status: string) => {
    if (status === 'all') return withdrawals.length;
    return withdrawals.filter(w => w.status === status).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Withdrawal Requests</h1>
          <p className="text-muted-foreground">
            Review and manage withdrawal requests from collection hosts.
          </p>
        </div>
        <Button variant="outline">Export Withdrawals</Button>
      </div>

      <div className="space-y-4">
        <Tabs defaultValue="all" value={currentTab} onValueChange={setCurrentTab}>
          <TabsList>
            <TabsTrigger value="all">
              All <span className="ml-1 text-xs bg-muted rounded-full px-2 py-0.5">{getTabCount('all')}</span>
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending <span className="ml-1 text-xs bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">{getTabCount('pending')}</span>
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved <span className="ml-1 text-xs bg-green-100 text-green-800 rounded-full px-2 py-0.5">{getTabCount('approved')}</span>
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected <span className="ml-1 text-xs bg-red-100 text-red-800 rounded-full px-2 py-0.5">{getTabCount('rejected')}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search withdrawals..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading withdrawal requests...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Collection</th>
                  <th>Host</th>
                  <th>Amount</th>
                  <th>Date Requested</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWithdrawals.length > 0 ? (
                  filteredWithdrawals.map((withdrawal) => (
                    <tr key={withdrawal.id} className="hover:bg-muted/50">
                      <td className="py-3 font-medium">
                        <Button variant="link" className="p-0 h-auto font-medium text-foreground hover:underline" asChild>
                          <Link to={`/collections/${withdrawal.collectionId}`}>
                            {withdrawal.collectionName}
                          </Link>
                        </Button>
                      </td>
                      <td>
                        <Button variant="link" className="p-0 h-auto font-normal text-foreground hover:underline block text-left" asChild>
                          <Link to={`/users/${withdrawal.hostId}`}>
                            <div>{withdrawal.hostName}</div>
                            <div className="text-xs text-muted-foreground font-normal no-underline opacity-70">{withdrawal.hostEmail}</div>
                          </Link>
                        </Button>
                      </td>
                      <td className="font-medium">{formatCurrency(withdrawal.requestedAmount)}</td>
                      <td>{formatDate(withdrawal.dateRequested)}</td>
                      <td>{getStatusBadge(withdrawal.status)}</td>
                      <td>
                        <div className="flex space-x-2">
                          {withdrawal.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-500 text-green-600 hover:bg-green-50"
                                onClick={() => handleApprove(withdrawal.id)}
                                disabled={actionLoading === withdrawal.id}
                              >
                                {actionLoading === withdrawal.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Approve'
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500 text-red-600 hover:bg-red-50"
                                onClick={() => handleReject(withdrawal.id)}
                                disabled={actionLoading === withdrawal.id}
                              >
                                {actionLoading === withdrawal.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Reject'
                                )}
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/withdrawals/${withdrawal.id}`}>View</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      No withdrawal requests found matching your criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WithdrawalsPage;
