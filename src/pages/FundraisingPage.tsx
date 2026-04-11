
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search, Heart, Clock, CheckCircle, PauseCircle, XCircle, TrendingUp } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useFundraisingStore, CampaignStatus } from '@/stores/fundraisingStore';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending_verification: { label: 'Pending Approval', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  active: { label: 'Active', className: 'bg-green-50 text-green-700 border-green-200' },
  paused: { label: 'Paused', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' },
  closed: { label: 'Closed', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  completed: { label: 'Completed', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const FundraisingPage = () => {
  const { campaigns, loading, error, stats, fetchCampaigns } = useFundraisingStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    }
  }, [error, toast]);

  const filtered = campaigns.filter((c) => {
    const matchesSearch =
      !searchTerm ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.creator_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.creator_email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      c.status === statusFilter ||
      (statusFilter === 'pending_verification' && (c.status === 'pending_verification' || c.status === 'pending'));

    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: CampaignStatus | null) => {
    const cfg = STATUS_CONFIG[status || 'draft'] || STATUS_CONFIG['draft'];
    return (
      <Badge variant="outline" className={`text-xs font-medium ${cfg.className}`}>
        {cfg.label}
      </Badge>
    );
  };

  const statCards = [
    {
      label: 'Total Campaigns',
      value: stats.total,
      icon: Heart,
      iconClass: 'text-pink-500',
      bgClass: 'bg-pink-50',
    },
    {
      label: 'Pending Approval',
      value: stats.pending_verification,
      icon: Clock,
      iconClass: 'text-amber-500',
      bgClass: 'bg-amber-50',
      highlight: stats.pending_verification > 0,
    },
    {
      label: 'Active Campaigns',
      value: stats.active,
      icon: CheckCircle,
      iconClass: 'text-green-500',
      bgClass: 'bg-green-50',
    },
    {
      label: 'Paused / Closed',
      value: stats.paused + stats.closed,
      icon: PauseCircle,
      iconClass: 'text-blue-500',
      bgClass: 'bg-blue-50',
    },
    {
      label: 'Rejected',
      value: stats.rejected,
      icon: XCircle,
      iconClass: 'text-red-500',
      bgClass: 'bg-red-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Heart className="h-6 w-6 text-pink-500" />
            Fundraising Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Review, approve, and monitor all fundraising campaigns on the platform.
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchCampaigns()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Refresh
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <Card
            key={card.label}
            className={`border ${card.highlight ? 'border-amber-300 ring-1 ring-amber-200' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`${card.bgClass} p-2 rounded-lg`}>
                  <card.icon className={`h-5 w-5 ${card.iconClass}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{card.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Approval Alert */}
      {stats.pending_verification > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-amber-800">
              {stats.pending_verification} campaign{stats.pending_verification > 1 ? 's' : ''} pending your review
            </p>
            <p className="text-sm text-amber-600">Click "Pending Approval" to filter and review them.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={() => setStatusFilter('pending_verification')}
          >
            View Pending
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, creator name or email..."
            className="pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending_verification">Pending Approval</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {['Alumni','Charity','Community','Disaster','Education','Legal','Medical','Politics','Sports','Others'].map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading campaigns...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Creator</th>
                  <th>Category</th>
                  <th>Target</th>
                  <th>Raised</th>
                  <th>Docs</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className={`hover:bg-muted/50 ${campaign.status === 'pending_verification' || campaign.status === 'pending' ? 'bg-amber-50/30' : ''}`}
                    >
                      <td className="py-3 max-w-[200px]">
                        <div className="font-medium truncate">{campaign.title}</div>
                        {campaign.city && (
                          <div className="text-xs text-muted-foreground">{campaign.city}, {campaign.country || 'Nigeria'}</div>
                        )}
                      </td>
                      <td>
                        <Button variant="link" className="p-0 h-auto font-normal text-foreground" asChild>
                          <Link to={`/users/${campaign.creator_id}`}>
                            {campaign.creator_name}
                          </Link>
                        </Button>
                        <div className="text-xs text-muted-foreground">{campaign.creator_email}</div>
                      </td>
                      <td>
                        {campaign.category ? (
                          <Badge variant="secondary" className="text-xs">{campaign.category}</Badge>
                        ) : '—'}
                      </td>
                      <td className="font-medium">
                        {campaign.target_amount ? formatCurrency(campaign.target_amount) : 'Open'}
                      </td>
                      <td className="text-green-600 font-medium">
                        {formatCurrency(campaign.total_raised)}
                      </td>
                      <td>
                        <span className={`text-sm font-medium ${campaign.verification_documents.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {campaign.verification_documents.length} doc{campaign.verification_documents.length !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td>{getStatusBadge(campaign.status)}</td>
                      <td className="text-muted-foreground text-sm">
                        {campaign.created_at ? formatDate(campaign.created_at) : '—'}
                      </td>
                      <td>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/fundraising/${campaign.id}`}>
                            {campaign.status === 'pending_verification' || campaign.status === 'pending' ? 'Review' : 'View'}
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground">
                      {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                        ? 'No campaigns match your filters'
                        : 'No fundraising campaigns found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-sm text-muted-foreground text-right">
          Showing {filtered.length} of {campaigns.length} campaigns
        </p>
      )}
    </div>
  );
};

export default FundraisingPage;
