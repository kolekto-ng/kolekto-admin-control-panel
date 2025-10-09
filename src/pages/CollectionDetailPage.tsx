
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Calendar, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatCurrency } from '@/lib/formatters';
// import { Collection, fetchCollections } from '@/services/mockData';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from "@/components/ui/progress";
import { useCollectionsStore } from '@/stores/collectionsStore';

const CollectionDetailPage = () => {
  const { id } = useParams();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const { fetchCollections, collections, getCollectionById } = useCollectionsStore()


  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        fetchCollections();
        const collection = getCollectionById(id);
        const collectionsData = collections.collectionsWithStats || [];
        console.log('Fetched Collections:', collection, id);

        const foundCollection = getCollectionById(id);

        if (foundCollection) {
          setCollection(foundCollection);
        }
      } catch (error) {
        console.error('Failed to load collection data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load collection data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, toast]);

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

  // Mock contributors data
  const contributors = Array(collection?.totalContributors || 0).fill(null).map((_, i) => ({
    id: `contrib-${i + 1}`,
    name: `Contributor ${i + 1}`,
    amount: Math.floor(Math.random() * 10000) + 1000,
    date: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString(),
    isAnonymous: Math.random() > 0.7,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading collection data...</span>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold">Collection not found</h2>
        <p className="mt-2 text-muted-foreground">The collection you're looking for doesn't exist or has been removed.</p>
        <Button asChild className="mt-4">
          <Link to="/collections">Back to Collections</Link>
        </Button>
      </div>
    );
  }

  // Mock target amount
  const targetAmount = collection.amountRaised * 1.5;
  const progressPercentage = Math.min(100, Math.round((collection.amountRaised / targetAmount) * 100));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/collections">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{collection.title}</h1>
          <div className="ml-2">{getStatusBadge(collection.status)}</div>
        </div>
        <div className="flex space-x-2">
          {collection.status === 'active' && (
            <Button variant="outline" className="border-status-error text-status-error hover:bg-status-error/5">
              Close Collection
            </Button>
          )}
          <Button variant="outline">Export Details</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collection Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Collection Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Description</h3>
                <p className="text-sm text-muted-foreground">
                  This is a fundraising collection to support {collection.title}. All funds raised will be used responsibly according to the stated purpose of this collection.
                </p>
              </div>

              <div className="pt-2">
                <h3 className="font-medium mb-2">Progress</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      Raised: <span className="font-medium">{formatCurrency(collection.amountRaised)}</span>
                    </span>
                    <span>Goal: {formatCurrency(targetAmount)}</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                  <div className="text-xs text-right text-muted-foreground">
                    {progressPercentage}% of goal reached
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div className="bg-muted/30 p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Host</div>
                  <div className="font-medium mt-1">
                    <Link to={`/users/${collection.id}`} className="hover:underline">
                      {collection.hostName}
                    </Link>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{collection.hostEmail}</div>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Created</div>
                  <div className="font-medium mt-1">{formatDate(collection.createdAt)}</div>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Contributors</div>
                  <div className="font-medium mt-1 flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {collection.totalContributors}
                  </div>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="font-medium mt-1">{collection.status.charAt(0).toUpperCase() + collection.status.slice(1)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="contributors">
            <TabsList>
              <TabsTrigger value="contributors">Contributors</TabsTrigger>
              <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
              <TabsTrigger value="activity">Activity Log</TabsTrigger>
            </TabsList>

            <TabsContent value="contributors">
              <Card>
                <CardContent className="p-0">
                  <table className="w-full data-table">
                    <thead>
                      <tr>
                        <th>Contributor</th>
                        <th>Amount</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contributors.map(contributor => (
                        <tr key={contributor.id}>
                          <td>
                            {contributor.isAnonymous ?
                              <span className="text-muted-foreground">Anonymous</span> :
                              contributor.name
                            }
                          </td>
                          <td>{formatCurrency(contributor.amount)}</td>
                          <td>{formatDate(contributor.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="withdrawals">
              <Card>
                <CardContent className="pt-6">
                  {collection.status === 'active' ? (
                    <ul className="space-y-4">
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-status-pending rounded-full mt-2"></div>
                        <div className="ml-3">
                          <div className="flex items-center">
                            <p className="text-sm">Host requested a withdrawal of {formatCurrency(20000)}</p>
                            <Badge variant="outline" className="ml-2 bg-status-pending/15 text-status-pending">Pending</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">2 days ago</span>
                        </div>
                      </li>
                    </ul>
                  ) : (
                    <div className="py-6 text-center">
                      <Wallet className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
                      <p className="mt-2 text-muted-foreground">No withdrawal requests for this collection.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardContent className="pt-6">
                  <ul className="space-y-4">
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-status-info rounded-full mt-2"></div>
                      <div className="ml-3">
                        <p className="text-sm">User made a contribution of {formatCurrency(5000)}</p>
                        <span className="text-xs text-muted-foreground">1 day ago</span>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-status-info rounded-full mt-2"></div>
                      <div className="ml-3">
                        <p className="text-sm">Host updated collection description</p>
                        <span className="text-xs text-muted-foreground">1 week ago</span>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-status-info rounded-full mt-2"></div>
                      <div className="ml-3">
                        <p className="text-sm">Collection created</p>
                        <span className="text-xs text-muted-foreground">{formatDate(collection.createdAt)}</span>
                      </div>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Stats & Related Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Collection Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total raised:</span>
                  <span className="font-medium">{formatCurrency(collection.raisedAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total withdrawn:</span>
                  <span className="font-medium">{formatCurrency(collection.totalWithdrawn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Available balance:</span>
                  <span className="font-medium">{formatCurrency(collection.availableBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total contributors:</span>
                  <span className="font-medium">{collection.contributors}</span>
                </div>
                {/* <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Average contribution:</span>
                  <span className="font-medium">
                    {formatCurrency(Math.round(collection.raisedAmount / collection.contributors))}
                  </span>
                </div> */}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Collection Share Link</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 p-3 rounded text-sm font-mono break-all">
                https://kolekto.app/c/{id}
              </div>
              <Button variant="outline" className="w-full mt-3">
                Copy Link
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CollectionDetailPage;
