import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, UserRound, CheckCircle, Clock, XCircle, ShieldOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/formatters';
import { Link, useLocation } from 'react-router-dom';
import { useUsersList } from '@/features/users/queries';
import type { VerificationStatus } from '@/features/users/api';
import { useListParams, useSearchField } from '@/hooks/useListParams';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { TableSkeleton, RefreshingIndicator } from '@/components/ui/table-skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const VERIFICATION_CONFIG: Record<VerificationStatus, { label: string; className: string; icon: typeof CheckCircle }> = {
  verified: {
    label: 'Verified',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle,
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock,
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle,
  },
  unverified: {
    label: 'Unverified',
    className: 'bg-gray-100 text-gray-500 border-gray-200',
    icon: ShieldOff,
  },
};

const PAGE_SIZE = 10;

const DEFAULT_FILTERS = { q: '', verification: 'all' };

const UsersPage = () => {
  const { toast } = useToast();
  const location = useLocation();

  // Search / filter / page live in the URL, so Back restores this exact view
  // and the restored view maps to the cache entry that populated it.
  const { filters, page, setFilters, setPage } = useListParams(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useSearchField(
    filters.q,
    (value) => setFilters({ q: value }),
  );

  const { data, isPending, isFetching, isError, error } = useUsersList({
    page,
    pageSize: PAGE_SIZE,
    search: filters.q,
    verification: filters.verification,
    sortBy: 'created_at',
    sortDir: 'desc',
  });

  const users = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useScrollRestoration(!isPending);

  useEffect(() => {
    if (isError) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to load users from database',
        variant: 'destructive',
      });
    }
  }, [isError, error, toast]);

  // A filter change can leave the admin past the end of a now-shorter result
  // set; step back to the last real page instead of showing an empty table.
  useEffect(() => {
    if (!isPending && page > totalPages) setPage(totalPages);
  }, [isPending, page, totalPages, setPage]);

  const getUserStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="bg-status-success/15 text-status-success">Active</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="bg-status-pending/15 text-status-pending">Inactive</Badge>;
      default:
        return <Badge variant="outline" className="bg-muted/80 text-muted-foreground">{status}</Badge>;
    }
  };

  const getVerificationBadge = (status: VerificationStatus) => {
    const cfg = VERIFICATION_CONFIG[status];
    const Icon = cfg.icon;
    return (
      <Badge variant="outline" className={`text-xs font-medium ${cfg.className}`}>
        <Icon className="h-3 w-3 mr-1" />
        {cfg.label}
      </Badge>
    );
  };

  const startIndex = (page - 1) * PAGE_SIZE;

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);
      if (page <= 3) end = 4;
      else if (page >= totalPages - 2) start = totalPages - 3;
      if (start > 2) pages.push('ellipsis1');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('ellipsis2');
      pages.push(totalPages);
    }

    return pages.map((p, index) => {
      if (typeof p === 'string') {
        return (
          <PaginationItem key={`${p}-${index}`}>
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
      return (
        <PaginationItem key={p}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setPage(p);
            }}
            isActive={page === p}
            className="cursor-pointer"
          >
            {p}
          </PaginationLink>
        </PaginationItem>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Accounts</h1>
          <p className="text-muted-foreground">
            Manage and monitor all registered users on the platform.
          </p>
        </div>
        <Button variant="outline">Export Users</Button>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or phone..."
            className="pl-10"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select
          value={filters.verification}
          onValueChange={(value) => setFilters({ verification: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Verification Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border shadow-sm">
        {/*
          isPending means this exact view has never been loaded — the only case
          that warrants a skeleton. Revisits and filter changes keep the previous
          rows visible (keepPreviousData) and surface the refresh as the small
          indicator below the table instead.
        */}
        {isPending ? (
          <TableSkeleton rows={PAGE_SIZE} columns={8} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Collections</th>
                  <th>Joined</th>
                  <th>Verification</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/50">
                      <td className="py-3 flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <UserRound className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="font-medium">{user.name}</div>
                      </td>
                      <td>{user.email}</td>
                      <td>{user.phone || '—'}</td>
                      <td>{user.collections}</td>
                      <td>{formatDate(user.joinDate)}</td>
                      <td>{getVerificationBadge(user.verificationStatus)}</td>
                      <td>{getUserStatusBadge(user.status)}</td>
                      <td>
                        <Button variant="ghost" size="sm" asChild>
                          {/*
                            Carry the list query string so the detail page's Back
                            link returns to this precise view.
                          */}
                          <Link to={`/users/${user.id}`} state={{ from: location.search }}>
                            View
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      No users found matching your search criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isPending && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <p className="text-sm text-muted-foreground flex items-center gap-3">
            <span>
              {total > 0
                ? `Showing ${startIndex + 1}–${Math.min(startIndex + PAGE_SIZE, total)} of ${total} users`
                : 'No users found'}
            </span>
            <RefreshingIndicator show={isFetching} />
          </p>

          {totalPages > 1 && (
            <Pagination className="w-auto mx-0">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) setPage(page - 1);
                    }}
                    className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>

                {renderPageNumbers()}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) setPage(page + 1);
                    }}
                    className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
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

export default UsersPage;
