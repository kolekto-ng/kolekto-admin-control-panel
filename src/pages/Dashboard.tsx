
import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { formatCurrency } from '@/lib/formatters';
import { StatsSkeleton } from '@/components/dashboard/StatsSkeleton';
import { useDashboardStore } from '@/stores/dashboardStore';

const Dashboard = () => {
  const { stats, transactions, loading, error, fetchDashboardData } = useDashboardStore();
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          A summary of all platform activities and key metrics.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <StatsSkeleton />
        ) : stats ? (
          <>
            <StatsCard 
              title="Total Users" 
              value={stats.totalUsers.toString()}
              description="Registered accounts"
              icon="users"
              trend="up"
              trendValue="12%"
            />
            <StatsCard 
              title="Total Collections" 
              value={stats.totalCollections.toString()}
              description="Active fundraising campaigns"
              icon="folders"
              trend="up"
              trendValue="5%"
            />
            <StatsCard 
              title="Total Contributions" 
              value={formatCurrency(stats.totalContributions)}
              description="Sum of successful payments"
              icon="coins"
              trend="up"
              trendValue="8%"
            />
            <StatsCard 
              title="Total Withdrawals" 
              value={formatCurrency(stats.totalWithdrawals)}
              description="All-time withdrawals"
              icon="wallet"
              trend="stable"
            />
            <StatsCard 
              title="Approved Withdrawals" 
              value={formatCurrency(stats.approvedWithdrawals)}
              description="Processed and completed"
              icon="check"
              trend="up"
              trendValue="3%"
              variant="success"
            />
            <StatsCard 
              title="Pending Withdrawals" 
              value={stats.pendingWithdrawals.toString()}
              description="Awaiting approval"
              icon="clock"
              trend="up"
              trendValue="2"
              variant="warning"
              notification={stats.pendingWithdrawals > 0}
            />
            <StatsCard 
              title="Flagged Transactions" 
              value={stats.flaggedTransactions.toString()}
              description="Requires attention"
              icon="alert-circle"
              trend="down"
              trendValue="5%"
              variant="danger"
              notification={stats.flaggedTransactions > 0}
            />
          </>
        ) : (
          <p>Failed to load stats data</p>
        )}
      </div>

      {/* Recent Activity & Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-3 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Recent Transactions</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>Loading transactions...</span>
            </div>
          ) : (
            <RecentTransactions transactions={transactions} />
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
