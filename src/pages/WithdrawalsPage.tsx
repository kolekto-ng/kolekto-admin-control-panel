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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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


  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

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
    setCurrentPage(1);
  }, [searchTerm, currentTab, withdrawals]);

  const totalPages = Math.ceil(filteredWithdrawals.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedWithdrawals = filteredWithdrawals.slice(startIndex, endIndex);

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      if (start > 2) {
        pages.push('ellipsis1');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('ellipsis2');
      }

      pages.push(totalPages);
    }

    return pages.map((page, index) => {
      if (page === 'ellipsis1' || page === 'ellipsis2') {
        return (
          <PaginationItem key={`ellipsis-${index}`}>
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      return (
        <PaginationItem key={page}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setCurrentPage(page as number);
            }}
            isActive={currentPage === page}
            className="cursor-pointer"
          >
            {page}
          </PaginationLink>
        </PaginationItem>
      );
    });
  };

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
        description: error instanceof Error ? error.message : "Failed to approve withdrawal request.",
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
        description: error instanceof Error ? error.message : "Failed to reject withdrawal request.",
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
                {paginatedWithdrawals.length > 0 ? (
                  paginatedWithdrawals.map((withdrawal) => (
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

      {filteredWithdrawals.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Showing {filteredWithdrawals.length > 0 ? startIndex + 1 : 0}–{Math.min(endIndex, filteredWithdrawals.length)} of {filteredWithdrawals.length} withdrawal requests
            {filteredWithdrawals.length !== withdrawals.length && ` (filtered from ${withdrawals.length} total)`}
          </p>

          {totalPages > 1 && (
            <Pagination className="w-auto mx-0">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) setCurrentPage(currentPage - 1);
                    }}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>

                {renderPageNumbers()}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                    }}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
    </div>
  );
};

export default WithdrawalsPage;
