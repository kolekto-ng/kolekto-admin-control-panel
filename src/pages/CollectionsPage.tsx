import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Link, useLocation } from 'react-router-dom';
import { useCollectionsList, useCollectionTypeCounts } from '@/features/collections/queries';
import { useListParams, useSearchField } from '@/hooks/useListParams';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { TableSkeleton, RefreshingIndicator } from '@/components/ui/table-skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const COLLECTION_TYPE_LABELS: Record<string, string> = {
  fixed: 'Fixed',
  tiered: 'Tiered',
  ticket: 'Ticket',
  open_pool: 'Open Pool',
  fundraising: 'Fundraising',
  flat: 'Fixed',
};

const COLLECTION_TYPE_COLORS: Record<string, string> = {
  fixed: 'bg-blue-100 text-blue-700 border-blue-200',
  flat: 'bg-blue-100 text-blue-700 border-blue-200',
  tiered: 'bg-purple-100 text-purple-700 border-purple-200',
  ticket: 'bg-amber-100 text-amber-700 border-amber-200',
  open_pool: 'bg-teal-100 text-teal-700 border-teal-200',
  fundraising: 'bg-pink-100 text-pink-700 border-pink-200',
};

const PAGE_SIZE = 10;

const DEFAULT_FILTERS = { q: '', status: 'all', type: 'all' };

const CollectionsPage = () => {
  const { toast } = useToast();
  const location = useLocation();

  const { filters, page, setFilters, setPage } = useListParams(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useSearchField(
    filters.q,
    (value) => setFilters({ q: value }),
  );

  const { data, isPending, isFetching, isError, error } = useCollectionsList({
    page,
    pageSize: PAGE_SIZE,
    search: filters.q,
    status: filters.status,
    type: filters.type,
    sortBy: 'created_at',
    sortDir: 'desc',
  });

  // Whole-table aggregate for the summary pills. Separate cache entry with its
  // own longer staleTime so paging the table does not re-run the aggregate.
  const { data: typeCounts = {} } = useCollectionTypeCounts();

  const collections = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const grandTotal = Object.values(typeCounts).reduce((a, b) => a + b, 0);

  useScrollRestoration(!isPending);

  useEffect(() => {
    if (isError) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to load collections',
        variant: 'destructive',
      });
    }
  }, [isError, error, toast]);

  useEffect(() => {
    if (!isPending && page > totalPages) setPage(totalPages);
  }, [isPending, page, totalPages, setPage]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Completed</Badge>;
      case 'paused':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Paused</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">Closed</Badge>;
      case 'pending_review':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Pending Review</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">{status}</Badge>;
    }
  };

  const getTypeBadge = (collectionType: string) => {
    const label = COLLECTION_TYPE_LABELS[collectionType] || collectionType;
    const colorClass = COLLECTION_TYPE_COLORS[collectionType] || 'bg-gray-100 text-gray-700 border-gray-200';
    return (
      <Badge variant="outline" className={`capitalize font-medium text-xs ${colorClass}`}>
        {label}
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
          <h1 className="text-2xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground">
            Manage and monitor all collections across all types on the platform.
          </p>
        </div>
        <Button variant="outline">Export Collections</Button>
      </div>

      {/* Type Summary Pills */}
      {grandTotal > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilters({ type: 'all' })}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filters.type === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All ({grandTotal})
          </button>
          {Object.entries(typeCounts).map(([type, count]) => (
            <button
              key={type}
              onClick={() => setFilters({ type })}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filters.type === type ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {COLLECTION_TYPE_LABELS[type] || type} ({count})
            </button>
          ))}
        </div>
      )}

      {/* Search and filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, organizer, or slug..."
            className="pl-10 w-full"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filters.type} onValueChange={(value) => setFilters({ type: value })}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="fixed">Fixed</SelectItem>
              <SelectItem value="tiered">Tiered</SelectItem>
              <SelectItem value="ticket">Ticket</SelectItem>
              <SelectItem value="open_pool">Open Pool</SelectItem>
              <SelectItem value="fundraising">Fundraising</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.status} onValueChange={(value) => setFilters({ status: value })}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Collections Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {isPending ? (
          <TableSkeleton rows={PAGE_SIZE} columns={9} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Organizer</th>
                  <th>Amount Raised</th>
                  <th>Target</th>
                  <th>Contributors</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {collections.length > 0 ? (
                  collections.map((collection) => (
                    <tr key={collection.id} className="hover:bg-muted/50">
                      <td className="py-3 font-medium max-w-[200px]">
                        <div className="truncate">{collection.title}</div>
                        {collection.slug && (
                          <div className="text-xs text-muted-foreground truncate">/{collection.slug}</div>
                        )}
                      </td>
                      <td>{getTypeBadge(collection.collection_type)}</td>
                      <td>
                        <Button variant="link" className="p-0 h-auto font-normal text-foreground" asChild>
                          <Link to={`/users/${collection.userId}`}>
                            {collection.organizer}
                          </Link>
                        </Button>
                      </td>
                      <td className="font-medium">{formatCurrency(collection.raisedAmount)}</td>
                      <td className="text-muted-foreground">
                        {collection.targetAmount ? formatCurrency(collection.targetAmount) : '—'}
                      </td>
                      <td>{collection.contributors}</td>
                      <td>{getStatusBadge(collection.status)}</td>
                      <td className="text-muted-foreground">{formatDate(collection.createdAt)}</td>
                      <td>
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            to={`/collections/${collection.id}`}
                            state={{ from: location.search }}
                          >
                            View
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground">
                      {filters.q || filters.status !== 'all' || filters.type !== 'all'
                        ? 'No collections match your filters'
                        : 'No collections found'}
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
                ? `Showing ${startIndex + 1}–${Math.min(startIndex + PAGE_SIZE, total)} of ${total} collections`
                : 'No collections found'}
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
                    className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
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
                    className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
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

export default CollectionsPage;
