
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, UserRound } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/formatters';
import { Link } from 'react-router-dom';
import { useUsersStore } from '@/stores/usersStore';

const UsersPage = () => {
  const { users, loading, error, fetchUsers } = useUsersStore();
  const [filteredUsers, setFilteredUsers] = useState(users);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  console.log('Users:', users);


  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      setFilteredUsers(users.filter(user =>
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.phone.includes(term)
      ));
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

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
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or phone..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading users...</span>
          </div>
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
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/50">
                      <td className="py-3 flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <UserRound className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="font-medium">{user.name}</div>
                      </td>
                      <td>{user.email}</td>
                      <td>{user.phone}</td>
                      <td>{user.collections}</td>
                      <td>{formatDate(user.joinDate)}</td>
                      <td>{getUserStatusBadge(user.status)}</td>
                      <td>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/users/${user.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No users found matching your search criteria
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

export default UsersPage;
