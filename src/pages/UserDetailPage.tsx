
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User as UserIcon, Mail, Phone, Calendar, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/formatters';
// import { User, Collection, fetchUsers, fetchCollections } from '@/services/mockData';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { log } from 'console';
import { useUsersStore } from '@/stores/usersStore';
import { useCollectionsStore } from '@/stores/collectionsStore';

const UserDetailPage = () => {
  const { id } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { fetchUsers, getUserById } = useUsersStore()
  const { fetchCollections, collections: allCollections } = useCollectionsStore()

  console.log('User ID:', id);


  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const usersData = await fetchUsers();
        console.log('Fetched Users:', usersData);
        // const foundUser = usersData.find(u => u.id == id);
        const foundUser = getUserById(id);


        if (foundUser) {
          setUser(foundUser);
          console.log('Found User:', foundUser);

          // Fetch collections for this user
          // const allCollections = await fetchCollections();
          console.log('All Collections:', allCollections);

          const userCollections = allCollections.data.filter(
            c => c.user_id === foundUser.id);
          setCollections(userCollections);
          console.log('User Collections:', userCollections);
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load user data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, toast]);

  const getUserStatusBadge = (status: User['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="bg-status-success/15 text-status-success">Active</Badge>;
      case 'suspended':
        return <Badge variant="outline" className="bg-status-pending/15 text-status-pending">Suspended</Badge>;
      case 'flagged':
        return <Badge variant="outline" className="bg-status-error/15 text-status-error">Flagged</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading user data...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold">User not found</h2>
        <p className="mt-2 text-muted-foreground">The user you're looking for doesn't exist or has been removed.</p>
        <Button asChild className="mt-4">
          <Link to="/users">Back to Users</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/users">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">User Details</h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">Reset Password</Button>
          {user.status !== 'suspended' ? (
            <Button variant="outline" className="text-status-pending border-status-pending hover:bg-status-pending/5">
              Suspend User
            </Button>
          ) : (
            <Button variant="outline" className="text-status-success border-status-success hover:bg-status-success/5">
              Activate User
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                <UserIcon size={40} className="text-gray-500" />
              </div>
            </div>

            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">{user.fullName}</h3>
              <div className="mt-1">{getUserStatusBadge(user.status)}</div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{user.email}</span>
              </div>
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{user.phone}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                <span className="text-sm">Joined on user.dateJoined</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Activity & Collections */}
        <div className="md:col-span-2">
          <Tabs defaultValue="collections">
            <TabsList className="mb-4">
              <TabsTrigger value="collections">Collections ({collections.length})</TabsTrigger>
              <TabsTrigger value="activity">Activity Log</TabsTrigger>
            </TabsList>

            <TabsContent value="collections">
              <Card>
                <CardContent className="p-0">
                  {collections.length > 0 ? (
                    <table className="w-full data-table">
                      <thead>
                        <tr>
                          <th>Collection</th>
                          <th>Amount Raised</th>
                          <th>Status</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {collections.map(collection => (
                          <tr key={collection.id}>
                            <td className="font-medium">{collection.title}</td>
                            <td>₦{collection.amountRaised}</td>
                            <td>
                              {collection.status === 'active' && (
                                <Badge variant="outline" className="bg-status-success/15 text-status-success">Active</Badge>
                              )}
                              {collection.status === 'completed' && (
                                <Badge variant="outline" className="bg-status-info/15 text-status-info">Completed</Badge>
                              )}
                              {collection.status === 'closed' && (
                                <Badge variant="outline" className="bg-muted/80 text-muted-foreground">Closed</Badge>
                              )}
                            </td>
                            <td>{(collection.dateCreated)}</td>
                            <td>
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/collections/${collection.id}`}>View</Link>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-muted-foreground">No collections created by this user.</p>
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
                        <p className="text-sm">User created collection "Medical Support Fund"</p>
                        <span className="text-xs text-muted-foreground">3 days ago</span>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-status-info rounded-full mt-2"></div>
                      <div className="ml-3">
                        <p className="text-sm">User requested a withdrawal of ₦25,000</p>
                        <span className="text-xs text-muted-foreground">1 week ago</span>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-status-info rounded-full mt-2"></div>
                      <div className="ml-3">
                        <p className="text-sm">Account created</p>
                        <span className="text-xs text-muted-foreground">{(user.dateJoined)}</span>
                      </div>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default UserDetailPage;
