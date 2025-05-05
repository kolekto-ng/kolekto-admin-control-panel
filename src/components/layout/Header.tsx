
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center px-4 md:px-6">
      <div className="flex-1">
        <h1 className="text-xl font-semibold text-gray-800">Kolekto Admin Dashboard</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <div className="relative">
          <Button variant="ghost" size="icon">
            <Bell size={20} />
            {/* Notification dot */}
            <span className="absolute top-0 right-0 notification-dot">
              <span></span>
              <span></span>
            </span>
          </Button>
        </div>
        
        {/* User Profile */}
        <div className="relative flex items-center gap-2">
          <span className="text-sm font-medium">Admin User</span>
          <div className="w-8 h-8 rounded-full bg-kolekto-orange text-white flex items-center justify-center">
            A
          </div>
        </div>
      </div>
    </header>
  );
};
