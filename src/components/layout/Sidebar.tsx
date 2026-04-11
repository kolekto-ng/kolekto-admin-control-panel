
import { useState, useEffect } from 'react';
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
  ShieldCheck,
  ArrowLeftRight,
  Heart,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [pendingFundraisers, setPendingFundraisers] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [pendingKyc, setPendingKyc] = useState(0);

  useEffect(() => {
    const fetchBadgeCounts = async () => {
      const [{ count: fundraiserCount }, { count: withdrawalCount }, { count: kycCount }] = await Promise.all([
        supabase
          .from('campaigns')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending_verification', 'pending']),
        supabase
          .from('withdrawals')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('kyc_verifications')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ]);
      setPendingFundraisers(fundraiserCount || 0);
      setPendingWithdrawals(withdrawalCount || 0);
      setPendingKyc(kycCount || 0);
    };
    fetchBadgeCounts();
  }, []);

  const navItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/',
    },
    {
      name: 'Users',
      icon: Users,
      path: '/users',
    },
    {
      name: 'Collections',
      icon: Folders,
      path: '/collections',
    },
    {
      name: 'Fundraising',
      icon: Heart,
      path: '/fundraising',
      badge: pendingFundraisers > 0 ? pendingFundraisers : undefined,
      badgeColor: 'bg-pink-500',
    },
    {
      name: 'Withdrawals',
      icon: Wallet,
      path: '/withdrawals',
      badge: pendingWithdrawals > 0 ? pendingWithdrawals : undefined,
      badgeColor: 'bg-status-pending',
    },
    {
      name: 'Transactions',
      icon: ArrowLeftRight,
      path: '/transactions',
    },
    {
      name: 'KYC',
      icon: ShieldCheck,
      path: '/kyc',
      badge: pendingKyc > 0 ? pendingKyc : undefined,
      badgeColor: 'bg-indigo-500',
    },
    {
      name: 'Settings',
      icon: Settings,
      path: '/settings',
    },
  ];

  return (
    <div
      className={cn(
        'bg-sidebar text-sidebar-foreground h-full relative transition-all duration-300 flex flex-col',
        collapsed ? 'w-[70px]' : 'w-64'
      )}
    >
      {/* Collapse Button */}
      <button
        className="absolute -right-3 top-10 bg-white text-gray-600 rounded-full p-1 border shadow-sm hover:bg-gray-50 z-10"
        onClick={() => setCollapsed(prev => !prev)}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-sidebar-border flex-shrink-0',
        collapsed ? 'justify-center' : 'justify-start'
      )}>
        <img
          src="/lovable-uploads/6fdf0a9f-1402-4c43-b9bf-be38c3e2d490.png"
          alt="Kolekto Logo"
          className={cn(
            'transition-all duration-300',
            collapsed ? 'h-8' : 'h-10'
          )}
        />
        {!collapsed && <span className="ml-2 text-xl font-semibold">Admin</span>}
      </div>

      {/* Navigation */}
      <nav className="px-2 py-4 flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.path}
                className={({ isActive }) => cn(
                  'flex items-center py-2 px-3 rounded-md transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'hover:bg-sidebar-accent/50',
                  collapsed ? 'justify-center' : 'justify-start'
                )}
                end={item.path === '/'}
              >
                <item.icon size={20} />
                {!collapsed && (
                  <span className="ml-3 flex-1">{item.name}</span>
                )}
                {!collapsed && item.badge !== undefined && (
                  <span className={cn(
                    'ml-auto text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium',
                    item.badgeColor || 'bg-status-pending'
                  )}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
                {collapsed && item.badge !== undefined && (
                  <span className={cn(
                    'absolute top-1 right-1 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-medium',
                    item.badgeColor || 'bg-status-pending'
                  )}>
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
        'p-4 border-t border-sidebar-border flex-shrink-0',
        collapsed ? 'text-center' : ''
      )}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center font-semibold flex-shrink-0">
            A
          </div>
          {!collapsed && (
            <div>
              <p className="font-medium text-sm">Admin</p>
              <p className="text-xs text-muted-foreground">Super Admin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
