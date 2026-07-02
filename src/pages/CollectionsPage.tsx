
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Link } from 'react-router-dom';
import { useCollectionsStore } from '@/stores/collectionsStore';
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

const CollectionsPage = () => {
  const { collections, loading, error, fetchCollections } = useCollectionsStore();
  const [filteredCollections, setFilteredCollections] = useState(collections);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const { toast } = useToast();

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter]);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  useEffect(() => {
    let filtered = collections || [];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(collection =>
        collection.title.toLowerCase().includes(term) ||
        collection.organizer.toLowerCase().includes(term) ||
        (collection.slug && collection.slug.toLowerCase().includes(term))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(collection => collection.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(collection => {
        const canonicalType = (collection.collection_type && collection.collection_type !== 'fixed')
          ? collection.collection_type
          : (collection.type || 'fixed');
        return canonicalType === typeFilter;
      });
    }

    setFilteredCollections(filtered);
  }, [searchTerm, statusFilter, typeFilter, collections]);

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

  // Count by type for summary
  const typeCounts = collections.reduce((acc: Record<string, number>, c) => {
    const t = (c.collection_type && c.collection_type !== 'fixed')
      ? c.collection_type
      : (c.type || 'fixed');
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const totalPages = Math.ceil(filteredCollections.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCollections = filteredCollections.slice(startIndex, endIndex);

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
      {!loading && collections.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${typeFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All ({collections.length})
          </button>
          {Object.entries(typeCounts).map(([type, count]) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${typeFilter === type ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading collections...</span>
          </div>
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
                {paginatedCollections.length > 0 ? (
                  paginatedCollections.map((collection) => (
                    <tr key={collection.id} className="hover:bg-muted/50">
                      <td className="py-3 font-medium max-w-[200px]">
                        <div className="truncate">{collection.title}</div>
                        {collection.slug && (
                          <div className="text-xs text-muted-foreground truncate">/{collection.slug}</div>
                        )}
                      </td>
                      <td>
                        {getTypeBadge(
                          (collection.collection_type && collection.collection_type !== 'fixed')
                            ? collection.collection_type
                            : (collection.type || 'fixed')
                        )}
                      </td>
                      <td>
                        <Button variant="link" className="p-0 h-auto font-normal text-foreground" asChild>
                          <Link to={`/users/${collection.userId}`}>
                            {collection.organizer}
                          </Link>
                        </Button>
                      </td>
                      <td className="font-medium">{formatCurrency(collection.raisedAmount)}</td>
                      <td className="text-muted-foreground">
                        {collection.target_amount ? formatCurrency(collection.target_amount) : '—'}
                      </td>
                      <td>{collection.contributors}</td>
                      <td>{getStatusBadge(collection.status)}</td>
                      <td className="text-muted-foreground">{formatDate(collection.createdAt)}</td>
                      <td>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/collections/${collection.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground">
                      {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
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

      {filteredCollections.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Showing {filteredCollections.length > 0 ? startIndex + 1 : 0}–{Math.min(endIndex, filteredCollections.length)} of {filteredCollections.length} collections
            {filteredCollections.length !== collections.length && ` (filtered from ${collections.length} total)`}
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

export default CollectionsPage;
