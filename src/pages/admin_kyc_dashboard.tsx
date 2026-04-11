import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Search,
  ShieldCheck,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { useKYCStore, KYCStatus } from '@/stores/kycStore';
import { useToast } from '@/components/ui/use-toast';

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock,
  },
  reviewing: {
    label: 'Reviewing',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Eye,
  },
  verified: {
    label: 'Verified',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle,
  },
};

const AdminKYCDashboard = () => {
  const { kycUsers, stats, loading, error, fetchKYCList } = useKYCStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchKYCList();
  }, [fetchKYCList]);

  useEffect(() => {
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    }
  }, [error, toast]);

  const filtered = kycUsers.filter((user) => {
    const matchesSearch =
      !searchTerm ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone_number || '').includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || user.kyc_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: KYCStatus) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['pending'];
    const Icon = cfg.icon;
    return (
      <Badge variant="outline" className={`text-xs font-medium ${cfg.className}`}>
        <Icon className="h-3 w-3 mr-1" />
        {cfg.label}
      </Badge>
    );
  };

  const statCards = [
    {
      label: 'Total Submissions',
      value: stats.total,
      icon: ShieldCheck,
      iconClass: 'text-indigo-500',
      bgClass: 'bg-indigo-50',
    },
    {
      label: 'Pending Review',
      value: stats.pending,
      icon: Clock,
      iconClass: 'text-amber-500',
      bgClass: 'bg-amber-50',
      highlight: stats.pending > 0,
    },
    {
      label: 'Verified',
      value: stats.verified,
      icon: CheckCircle,
      iconClass: 'text-emerald-500',
      bgClass: 'bg-emerald-50',
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-indigo-500" />
            KYC Verification Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Review, approve, and manage user identity verifications.
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchKYCList()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Refresh
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      {/* Pending Alert */}
      {stats.pending > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-amber-800">
              {stats.pending} KYC submission{stats.pending > 1 ? 's' : ''} pending your review
            </p>
            <p className="text-sm text-amber-600">Click "Pending Review" to filter and review them.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={() => setStatusFilter('pending')}
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
            placeholder="Search by name, email or phone..."
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewing">Reviewing</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading KYC submissions...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Date of Birth</th>
                  <th>ID Verified</th>
                  <th>Address Verified</th>
                  <th>KYC Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((user) => (
                    <tr
                      key={user.user_id}
                      className={`hover:bg-muted/50 ${user.kyc_status === 'pending' ? 'bg-amber-50/30' : ''}`}
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
                            {user.full_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{user.full_name}</span>
                        </div>
                      </td>
                      <td className="text-sm">{user.email}</td>
                      <td className="text-sm">{user.phone_number || '—'}</td>
                      <td className="text-sm">
                        {user.date_of_birth ? formatDate(user.date_of_birth) : '—'}
                      </td>
                      <td>
                        {user.identity_verified ? (
                          <span className="text-emerald-600 font-medium text-sm">✓ Yes</span>
                        ) : (
                          <span className="text-gray-400 text-sm">✗ No</span>
                        )}
                      </td>
                      <td>
                        {user.address_verified ? (
                          <span className="text-emerald-600 font-medium text-sm">✓ Yes</span>
                        ) : (
                          <span className="text-gray-400 text-sm">✗ No</span>
                        )}
                      </td>
                      <td>{getStatusBadge(user.kyc_status)}</td>
                      <td className="text-sm text-muted-foreground">
                        {user.submitted_at ? formatDate(user.submitted_at) : '—'}
                      </td>
                      <td>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/kyc/${user.user_id}`}>
                            {user.kyc_status === 'pending' ? 'Review' : 'View'}
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground">
                      {searchTerm || statusFilter !== 'all'
                        ? 'No submissions match your filters'
                        : 'No KYC submissions found'}
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
          Showing {filtered.length} of {kycUsers.length} submissions
        </p>
      )}
    </div>
  );
};

export default AdminKYCDashboard;