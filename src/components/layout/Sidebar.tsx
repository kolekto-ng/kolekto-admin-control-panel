
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  Folders, 
  Wallet,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/'
    },
    {
      name: 'Users',
      icon: Users,
      path: '/users'
    },
    {
      name: 'Collections',
      icon: Folders,
      path: '/collections'
    },
    {
      name: 'Withdrawals',
      icon: Wallet,
      path: '/withdrawals',
      badge: 3 // Example badge count for pending withdrawals
    },
    {
      name: 'Settings',
      icon: Settings,
      path: '/settings'
    }
  ];

  return (
    <div 
      className={cn(
        "bg-sidebar text-sidebar-foreground h-full relative transition-all duration-300",
        collapsed ? "w-[70px]" : "w-64"
      )}
    >
      {/* Collapse Button */}
      <button 
        className="absolute -right-3 top-10 bg-white text-gray-600 rounded-full p-1 border shadow-sm hover:bg-gray-50"
        onClick={() => setCollapsed(prev => !prev)}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
      
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-sidebar-border",
        collapsed ? "justify-center" : "justify-start"
      )}>
        <img 
          src="/lovable-uploads/6fdf0a9f-1402-4c43-b9bf-be38c3e2d490.png" 
          alt="Kolekto Logo" 
          className={cn(
            "transition-all duration-300",
            collapsed ? "h-8" : "h-10"
          )} 
        />
        {!collapsed && <span className="ml-2 text-xl font-semibold">Admin</span>}
      </div>
      
      {/* Navigation */}
      <nav className="px-2 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.name}>
              <NavLink 
                to={item.path} 
                className={({ isActive }) => cn(
                  "flex items-center py-2 px-3 rounded-md transition-colors",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-primary" 
                    : "hover:bg-sidebar-accent/50",
                  collapsed ? "justify-center" : "justify-start"
                )}
                end={item.path === '/'}
              >
                <item.icon size={20} />
                {!collapsed && (
                  <span className="ml-3 flex-1">{item.name}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="ml-auto bg-status-pending text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* User Profile (Bottom) */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border",
        collapsed ? "text-center" : ""
      )}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center">
            A
          </div>
          {!collapsed && <div className="font-medium">Admin</div>}
        </div>
      </div>
    </div>
  );
};
