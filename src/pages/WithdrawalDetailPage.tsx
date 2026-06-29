
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { useWithdrawalsStore } from '@/stores/withdrawalsStore';

const WithdrawalDetailPage = () => {
  const { id } = useParams();
  const { selectedWithdrawal, detailLoading, fetchWithdrawalById, approveWithdrawal, rejectWithdrawal } = useWithdrawalsStore();
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  const withdrawal = selectedWithdrawal;

  console.log(withdrawal, 'Withdrawal Detail Page');

  useEffect(() => {
    if (id) {
      fetchWithdrawalById(id);
    }
  }, [id, fetchWithdrawalById]);

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

  const handleApprove = async () => {
    if (!withdrawal) return;

    setActionLoading(true);
    try {
      await approveWithdrawal(withdrawal.id);
      toast({
        title: 'Withdrawal Approved',
        description: `The withdrawal request for ${formatCurrency(withdrawal.requestedAmount)} has been approved.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve withdrawal request.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!withdrawal) return;

    setActionLoading(true);
    try {
      await rejectWithdrawal(withdrawal.id);
      toast({
        title: 'Withdrawal Rejected',
        description: `The withdrawal request for ${formatCurrency(withdrawal.requestedAmount)} has been rejected.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject withdrawal request.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (detailLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading withdrawal data...</span>
      </div>
    );
  }

  if (!withdrawal) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold">Withdrawal request not found</h2>
        <p className="mt-2 text-muted-foreground">The withdrawal request you're looking for doesn't exist or has been removed.</p>
        <Button asChild className="mt-4">
          <Link to="/withdrawals">Back to Withdrawals</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/withdrawals">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Withdrawal Request</h1>
          <div className="ml-2">{getStatusBadge(withdrawal.status)}</div>
        </div>
        <div className="flex space-x-2">
          {withdrawal.status === 'pending' && (
            <>
              <Button
                variant="outline"
                className="border-status-error text-status-error hover:bg-status-error/5"
                onClick={handleReject}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <X className="h-4 w-4 mr-1" />}
                Reject
              </Button>
              <Button
                variant="outline"
                className="border-status-success text-status-success hover:bg-status-success/5"
                onClick={handleApprove}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                Approve
              </Button>
            </>
          )}
          <Button variant="outline">Export Details</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Withdrawal Details */}
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal Details</CardTitle>
            <CardDescription>Details of the withdrawal request</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Amount Requested</div>
                <div className="text-xl font-semibold">{formatCurrency(withdrawal.requestedAmount)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div>{getStatusBadge(withdrawal.status)}</div>
              </div>
            </div>

            <Separator />

            <div>
              <div className="text-sm text-muted-foreground">Collection</div>
              <div className="font-medium">
                <Link
                  to={`/collections/${withdrawal.collectionId}`}
                  className="hover:underline"
                >
                  {withdrawal.collectionName}
                </Link>
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Host</div>
              <div className="font-medium">{withdrawal.hostName}</div>
              <div className="text-xs text-muted-foreground">{withdrawal.hostEmail}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Date Requested</div>
              <div className="font-medium">{formatDate(withdrawal.dateRequested)}</div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card>
          <CardHeader>
            <CardTitle>Bank Details</CardTitle>
            <CardDescription>Account details for the transfer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Bank Name</div>
              <div className="font-medium">{withdrawal.bankName}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Account Name</div>
              <div className="font-medium">{withdrawal.accountName}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Account Number</div>
              <div className="font-medium">{withdrawal.accountNumber}</div>
            </div>

            <Separator />

            {withdrawal.status === 'approved' && (
              <div className="bg-status-success/5 border border-status-success/20 rounded-md p-4">
                <div className="font-medium text-status-success">Withdrawal Approved</div>
                <div className="text-sm mt-1">This withdrawal request has been approved and is ready for processing.</div>
                <div className="text-sm mt-2">
                  <strong>Approved at:</strong> {formatDate(new Date().toISOString())}
                </div>
              </div>
            )}

            {withdrawal.status === 'rejected' && (
              <div className="bg-status-error/5 border border-status-error/20 rounded-md p-4">
                <div className="font-medium text-status-error">Withdrawal Rejected</div>
                <div className="text-sm mt-1">This withdrawal request has been rejected.</div>
                <div className="text-sm mt-2">
                  <strong>Rejected at:</strong> {formatDate(new Date().toISOString())}
                </div>
              </div>
            )}

            {withdrawal.status === 'pending' && (
              <div className="bg-status-pending/5 border border-status-pending/20 rounded-md p-4">
                <div className="font-medium text-status-pending">Action Required</div>
                <div className="text-sm mt-1">This withdrawal request is awaiting your review and approval.</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WithdrawalDetailPage;
