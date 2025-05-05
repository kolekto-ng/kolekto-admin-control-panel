
import { useState, useEffect } from 'react';
import { Collection, fetchCollections } from '@/services/mockData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CollectionsPage = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    const loadCollections = async () => {
      try {
        setLoading(true);
        const data = await fetchCollections();
        setCollections(data);
        setFilteredCollections(data);
      } catch (error) {
        console.error('Failed to load collections:', error);
        toast({
          title: 'Error',
          description: 'Failed to load collections. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadCollections();
  }, [toast]);

  useEffect(() => {
    let filtered = collections;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(collection => 
        collection.title.toLowerCase().includes(term) ||
        collection.hostName.toLowerCase().includes(term) ||
        collection.hostEmail.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(collection => collection.status === statusFilter);
    }

    setFilteredCollections(filtered);
  }, [searchTerm, statusFilter, collections]);

  const getStatusBadge = (status: Collection['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="bg-status-success/15 text-status-success">Active</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-status-info/15 text-status-info">Completed</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-muted/80 text-muted-foreground">Closed</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground">
            Manage and monitor all fundraising collections on the platform.
          </p>
        </div>
        <Button variant="outline">Export Collections</Button>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search collections..."
            className="pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Collections Table */}
      <div className="bg-white rounded-lg border shadow-sm">
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
                  <th>Host</th>
                  <th>Amount Raised</th>
                  <th>Contributors</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCollections.length > 0 ? (
                  filteredCollections.map((collection) => (
                    <tr key={collection.id} className="hover:bg-muted/50">
                      <td className="py-3 font-medium">{collection.title}</td>
                      <td>
                        <div>{collection.hostName}</div>
                        <div className="text-xs text-muted-foreground">{collection.hostEmail}</div>
                      </td>
                      <td>{formatCurrency(collection.amountRaised)}</td>
                      <td>{collection.totalContributors}</td>
                      <td>{getStatusBadge(collection.status)}</td>
                      <td>{formatDate(collection.dateCreated)}</td>
                      <td>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/collections/${collection.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No collections found matching your criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionsPage;
