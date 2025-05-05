
import { useState, useEffect } from 'react';
import { Withdrawal, fetchWithdrawals } from '@/services/mockData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const WithdrawalsPage = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [filteredWithdrawals, setFilteredWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    const loadWithdrawals = async () => {
      try {
        setLoading(true);
        const data = await fetchWithdrawals();
        setWithdrawals(data);
        setFilteredWithdrawals(data);
      } catch (error) {
        console.error('Failed to load withdrawals:', error);
        toast({
          title: 'Error',
          description: 'Failed to load withdrawal requests. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadWithdrawals();
  }, [toast]);

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
        withdrawal.collectionName.toLowerCase().includes(term) ||
        withdrawal.hostName.toLowerCase().includes(term) ||
        withdrawal.hostEmail.toLowerCase().includes(term)
      );
    }

    setFilteredWithdrawals(filtered);
  }, [searchTerm, currentTab, withdrawals]);

  const getStatusBadge = (status: Withdrawal['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-status-pending/15 text-status-pending">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-status-success/15 text-status-success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-status-error/15 text-status-error">Rejected</Badge>;
    }
  };

  const handleApprove = (id: string) => {
    toast({
      title: "Withdrawal Approved",
      description: `Withdrawal request ${id} has been approved.`,
    });
  };

  const handleReject = (id: string) => {
    toast({
      title: "Withdrawal Rejected",
      description: `Withdrawal request ${id} has been rejected.`,
    });
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

      {/* Tabs and search */}
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

      {/* Withdrawals Table */}
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
                      <td className="py-3 font-medium">{withdrawal.collectionName}</td>
                      <td>
                        <div>{withdrawal.hostName}</div>
                        <div className="text-xs text-muted-foreground">{withdrawal.hostEmail}</div>
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
                              >
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-red-500 text-red-600 hover:bg-red-50"
                                onClick={() => handleReject(withdrawal.id)}
                              >
                                Reject
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
