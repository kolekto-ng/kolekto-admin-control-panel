
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Wallet, Users, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/formatters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';

// Mock notification types
type NotificationType = 'withdrawal' | 'user' | 'collection' | 'system';

// Mock notification interface
interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  date: string;
  isRead: boolean;
  link?: string;
}

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentTab, setCurrentTab] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    // Generate mock notifications
    const mockNotifications: Notification[] = [
      {
        id: 'notif-1',
        type: 'withdrawal',
        title: 'New Withdrawal Request',
        description: 'User requested ₦50,000 withdrawal from collection "Medical Support"',
        date: new Date(Date.now() - 10 * 60000).toISOString(), // 10 minutes ago
        isRead: false,
        link: '/withdrawals/with-1'
      },
      {
        id: 'notif-2',
        type: 'collection',
        title: 'New Collection Created',
        description: 'User created a new collection "School Fees Support"',
        date: new Date(Date.now() - 60 * 60000).toISOString(), // 1 hour ago
        isRead: false,
        link: '/collections/coll-2'
      },
      {
        id: 'notif-3',
        type: 'system',
        title: 'Flagged Transaction Detected',
        description: 'Suspicious activity on transaction #TXN-1234',
        date: new Date(Date.now() - 3 * 60 * 60000).toISOString(), // 3 hours ago
        isRead: false,
        link: '/transactions/txn-1234'
      },
      {
        id: 'notif-4',
        type: 'user',
        title: 'New User Registration',
        description: 'New user "John Doe" registered on the platform',
        date: new Date(Date.now() - 5 * 60 * 60000).toISOString(), // 5 hours ago
        isRead: true,
        link: '/users/user-50'
      },
      {
        id: 'notif-5',
        type: 'withdrawal',
        title: 'Pending Withdrawal Reminder',
        description: 'There are 3 pending withdrawal requests that need your attention',
        date: new Date(Date.now() - 24 * 60 * 60000).toISOString(), // 24 hours ago
        isRead: true,
        link: '/withdrawals'
      },
    ];

    setNotifications(mockNotifications);
  }, []);

  const getFilteredNotifications = () => {
    if (currentTab === 'all') return notifications;
    if (currentTab === 'unread') return notifications.filter(n => !n.isRead);
    return notifications.filter(n => n.type === currentTab);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? {...n, isRead: true} : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({...n, isRead: true})));
    toast({
      title: "All notifications marked as read",
    });
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch(type) {
      case 'withdrawal':
        return <Wallet className="h-5 w-5 text-status-pending" />;
      case 'user':
        return <Users className="h-5 w-5 text-status-info" />;
      case 'system':
        return <CircleAlert className="h-5 w-5 text-status-error" />;
      case 'collection':
        return <Bell className="h-5 w-5 text-status-success" />;
    }
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Manage and view system notifications
          </p>
        </div>
        <Button variant="outline" onClick={markAllAsRead}>
          Mark all as read
        </Button>
      </div>

      <Tabs defaultValue="all" value={currentTab} onValueChange={setCurrentTab}>
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="all">
              All <span className="ml-1 text-xs bg-muted rounded-full px-2 py-0.5">{notifications.length}</span>
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread <span className="ml-1 text-xs bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">{unreadCount}</span>
            </TabsTrigger>
            <TabsTrigger value="withdrawal">Withdrawals</TabsTrigger>
            <TabsTrigger value="collection">Collections</TabsTrigger>
            <TabsTrigger value="user">Users</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={currentTab}>
          <Card>
            <CardHeader>
              <CardTitle>{currentTab.charAt(0).toUpperCase() + currentTab.slice(1)} Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredNotifications.length > 0 ? (
                <ul className="space-y-4">
                  {filteredNotifications.map(notification => (
                    <li 
                      key={notification.id} 
                      className={`flex items-start border-b pb-4 last:border-0 last:pb-0 ${!notification.isRead ? 'bg-muted/20' : ''} rounded-md p-3`}
                    >
                      <div className="mt-1 mr-3">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{notification.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{notification.description}</p>
                            <span className="text-xs text-muted-foreground block mt-2">{formatDate(notification.date)}</span>
                          </div>
                          <div className="flex space-x-2">
                            {!notification.isRead && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-xs"
                                onClick={() => markAsRead(notification.id)}
                              >
                                Mark as read
                              </Button>
                            )}
                            {notification.link && (
                              <Button variant="outline" size="sm" asChild>
                                <Link to={notification.link}>View</Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-8 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground/20 mx-auto" />
                  <p className="mt-2 text-muted-foreground">No notifications to display</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationsPage;
