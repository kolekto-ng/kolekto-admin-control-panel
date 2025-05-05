
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, User, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export const Header = () => {
  const [notificationsCount, setNotificationsCount] = useState(3); // For demo purposes
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = () => {
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center px-4 md:px-6">
      <div className="flex-1">
        <h1 className="text-xl font-semibold text-gray-800">Kolekto Admin Dashboard</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell size={20} />
              {notificationsCount > 0 && (
                <span className="absolute top-0 right-0 flex h-4 w-4 -translate-y-1/3 translate-x-1/3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-error opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-status-error text-[10px] text-white items-center justify-center font-semibold">
                    {notificationsCount}
                  </span>
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <span className="font-semibold">Notifications</span>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/notifications">View All</Link>
              </Button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <div className="px-4 py-3 border-b hover:bg-muted/50 cursor-pointer">
                <div className="text-sm font-medium">New withdrawal request</div>
                <div className="text-xs text-muted-foreground mt-1">User requested ₦50,000 withdrawal from collection "Medical Support"</div>
                <div className="text-xs text-muted-foreground mt-1">10 minutes ago</div>
              </div>
              <div className="px-4 py-3 border-b hover:bg-muted/50 cursor-pointer">
                <div className="text-sm font-medium">New collection created</div>
                <div className="text-xs text-muted-foreground mt-1">User created a new collection "School Fees Support"</div>
                <div className="text-xs text-muted-foreground mt-1">1 hour ago</div>
              </div>
              <div className="px-4 py-3 hover:bg-muted/50 cursor-pointer">
                <div className="text-sm font-medium">Flagged transaction detected</div>
                <div className="text-xs text-muted-foreground mt-1">Suspicious activity on transaction #TXN-1234</div>
                <div className="text-xs text-muted-foreground mt-1">3 hours ago</div>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="relative flex items-center gap-2 cursor-pointer">
              <span className="hidden md:inline text-sm font-medium">Admin User</span>
              <div className="w-8 h-8 rounded-full bg-kolekto-orange text-white flex items-center justify-center">
                A
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="flex items-center text-status-error">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
