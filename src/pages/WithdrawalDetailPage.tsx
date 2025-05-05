
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { Withdrawal, fetchWithdrawals } from '@/services/mockData';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';

const WithdrawalDetailPage = () => {
  const { id } = useParams();
  const [withdrawal, setWithdrawal] = useState<Withdrawal | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const withdrawalsData = await fetchWithdrawals();
        const foundWithdrawal = withdrawalsData.find(w => w.id === id);
        
        if (foundWithdrawal) {
          setWithdrawal(foundWithdrawal);
        }
      } catch (error) {
        console.error('Failed to load withdrawal data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load withdrawal data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, toast]);

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

  const handleApprove = () => {
    if (!withdrawal) return;
    
    setWithdrawal({...withdrawal, status: 'approved'});
    toast({
      title: 'Withdrawal Approved',
      description: `The withdrawal request for ${formatCurrency(withdrawal.requestedAmount)} has been approved.`,
    });
  };

  const handleReject = () => {
    if (!withdrawal) return;
    
    setWithdrawal({...withdrawal, status: 'rejected'});
    toast({
      title: 'Withdrawal Rejected',
      description: `The withdrawal request for ${formatCurrency(withdrawal.requestedAmount)} has been rejected.`,
    });
  };

  if (loading) {
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

  // Mock bank details
  const bankDetails = {
    bankName: 'First Bank of Nigeria',
    accountName: withdrawal.hostName,
    accountNumber: '3010' + Math.floor(Math.random() * 10000000).toString().padStart(6, '0'),
  };

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
              >
                <X className="h-4 w-4 mr-1" /> Reject
              </Button>
              <Button 
                variant="outline" 
                className="border-status-success text-status-success hover:bg-status-success/5"
                onClick={handleApprove}
              >
                <Check className="h-4 w-4 mr-1" /> Approve
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
              <div className="font-medium">{bankDetails.bankName}</div>
            </div>
            
            <div>
              <div className="text-sm text-muted-foreground">Account Name</div>
              <div className="font-medium">{bankDetails.accountName}</div>
            </div>
            
            <div>
              <div className="text-sm text-muted-foreground">Account Number</div>
              <div className="font-medium">{bankDetails.accountNumber}</div>
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
