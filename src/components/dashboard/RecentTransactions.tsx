
import { formatCurrency } from '@/lib/formatters';
import { formatDistance } from 'date-fns';
import { Transaction } from '@/stores/dashboardStore';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export const RecentTransactions = ({ transactions }: RecentTransactionsProps) => {
  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'success': return 'bg-status-success/15 text-status-success';
      case 'pending': return 'bg-status-pending/15 text-status-pending';
      case 'failed': return 'bg-status-error/15 text-status-error';
      case 'flagged': return 'bg-status-error/15 text-status-error';
    }
  };

  const getTypeStyle = (type: Transaction['type']) => {
    return type === 'contribution' 
      ? 'text-status-success' 
      : 'text-status-info';
  };

  if (transactions.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No recent transactions</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full data-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Amount</th>
            <th>Status</th>
            <th>User</th>
            <th>Collection</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="hover:bg-muted/50">
              <td className={cn("font-medium", getTypeStyle(transaction.type))}>
                {transaction.type === 'contribution' ? 'Contribution' : 'Withdrawal'}
              </td>
              <td>{formatCurrency(transaction.amount)}</td>
              <td>
                <Badge variant="outline" className={cn("status-badge", getStatusColor(transaction.status))}>
                  {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                </Badge>
              </td>
              <td>{transaction.user}</td>
              <td className="max-w-[200px] truncate">{transaction.collection}</td>
              <td className="text-muted-foreground">
                {formatDistance(new Date(transaction.date), new Date(), { addSuffix: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
