
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { formatCurrency } from '@/lib/formatters';
import { StatsSkeleton } from '@/components/dashboard/StatsSkeleton';
import { useDashboardStore } from '@/stores/dashboardStore';
import { Badge } from '@/components/ui/badge';

const COLLECTION_TYPE_LABELS: Record<string, string> = {
  fixed: 'Fixed',
  flat: 'Fixed',
  tiered: 'Tiered',
  ticket: 'Ticket',
  open_pool: 'Open Pool',
  fundraising: 'Fundraising',
};

const COLLECTION_TYPE_COLORS: Record<string, string> = {
  fixed: 'bg-blue-100 text-blue-700',
  flat: 'bg-blue-100 text-blue-700',
  tiered: 'bg-purple-100 text-purple-700',
  ticket: 'bg-amber-100 text-amber-700',
  open_pool: 'bg-teal-100 text-teal-700',
  fundraising: 'bg-pink-100 text-pink-700',
};

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
              description="All collection types"
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
              title="Fundraising Campaigns"
              value={stats.totalCampaigns.toString()}
              description={`${stats.activeCampaigns} active`}
              icon="heart"
              trend="up"
              trendValue="3%"
            />
            <StatsCard
              title="Pending Fundraisers"
              value={stats.pendingFundraisers.toString()}
              description="Awaiting review & approval"
              icon="alert-circle"
              trend="stable"
              variant={stats.pendingFundraisers > 0 ? "warning" : undefined}
              notification={stats.pendingFundraisers > 0}
            />
            <StatsCard
              title="KYC Submissions"
              value={stats.totalKycSubmissions.toString()}
              description={`${stats.pendingKyc} pending review`}
              icon="shield"
              trend="stable"
            />
            <StatsCard
              title="Pending KYC"
              value={stats.pendingKyc.toString()}
              description="Awaiting verification"
              icon="shield"
              trend="stable"
              variant={stats.pendingKyc > 0 ? "warning" : undefined}
              notification={stats.pendingKyc > 0}
            />
          </>
        ) : (
          <p>Failed to load stats data</p>
        )}
      </div>

      {/* Collection Type Breakdown */}
      {stats && Object.keys(stats.collectionsByType).length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Collections by Type</h2>
            <Button variant="outline" size="sm" asChild>
              <Link to="/collections">View All</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(stats.collectionsByType).map(([type, count]) => (
              <Link key={type} to={`/collections?type=${type}`} className="block">
                <div className="border rounded-lg p-4 text-center hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium mb-2 ${COLLECTION_TYPE_COLORS[type] || 'bg-gray-100 text-gray-700'}`}>
                    {COLLECTION_TYPE_LABELS[type] || type}
                  </span>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">collections</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Fundraising Alert */}
      {stats && stats.pendingFundraisers > 0 && (
        <div className="flex items-center gap-3 bg-pink-50 border border-pink-200 rounded-lg p-4">
          <span className="text-2xl">❤️</span>
          <div className="flex-1">
            <p className="font-medium text-pink-800">
              {stats.pendingFundraisers} fundraising campaign{stats.pendingFundraisers > 1 ? 's need' : ' needs'} your review
            </p>
            <p className="text-sm text-pink-600">Review and approve or reject these pending fundraisers.</p>
          </div>
          <Button
            size="sm"
            className="bg-pink-600 hover:bg-pink-700 text-white shrink-0"
            asChild
          >
            <Link to="/fundraising">Review Now</Link>
          </Button>
        </div>
      )}

      {/* KYC Alert */}
      {stats && stats.pendingKyc > 0 && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <span className="text-2xl">🛡️</span>
          <div className="flex-1">
            <p className="font-medium text-indigo-800">
              {stats.pendingKyc} KYC submission{stats.pendingKyc > 1 ? 's need' : ' needs'} your review
            </p>
            <p className="text-sm text-indigo-600">Review and verify user identity documents.</p>
          </div>
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
            asChild
          >
            <Link to="/kyc">Review Now</Link>
          </Button>
        </div>
      )}

      {/* Recent Activity & Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-3 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Recent Transactions</h2>
            <Button variant="outline" size="sm" asChild>
              <Link to="/transactions">View All</Link>
            </Button>
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
