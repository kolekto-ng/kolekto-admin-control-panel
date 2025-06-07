
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  totalUsers: number;
  totalCollections: number;
  totalContributions: number;
  totalWithdrawals: number;
  approvedWithdrawals: number;
  pendingWithdrawals: number;
  flaggedTransactions: number;
}

export interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  date: string;
  status: string;
}

interface DashboardState {
  stats: DashboardStats | null;
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  fetchDashboardData: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: null,
  transactions: [],
  loading: false,
  error: null,

  fetchDashboardData: async () => {
    set({ loading: true, error: null });
    
    try {
      // Fetch stats in parallel
      const [
        { count: totalUsers },
        { count: totalCollections },
        { data: contributionsData },
        { data: withdrawalsData },
        { count: pendingWithdrawals },
        { data: transactionsData }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('collections').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('contributions').select('amount').eq('status', 'paid'),
        supabase.from('withdrawals').select('amount, status'),
        supabase.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(10)
      ]);

      // Calculate totals
      const totalContributions = contributionsData?.reduce((sum, contrib) => sum + contrib.amount, 0) || 0;
      const totalWithdrawals = withdrawalsData?.reduce((sum, withdrawal) => sum + withdrawal.amount, 0) || 0;
      const approvedWithdrawals = withdrawalsData
        ?.filter(w => w.status === 'approved')
        ?.reduce((sum, withdrawal) => sum + withdrawal.amount, 0) || 0;

      const stats: DashboardStats = {
        totalUsers: totalUsers || 0,
        totalCollections: totalCollections || 0,
        totalContributions,
        totalWithdrawals,
        approvedWithdrawals,
        pendingWithdrawals: pendingWithdrawals || 0,
        flaggedTransactions: 0, // This would need additional logic to determine flagged transactions
      };

      const transactions: Transaction[] = transactionsData?.map((transaction: any) => ({
        id: transaction.id,
        amount: transaction.amount,
        type: transaction.type,
        description: transaction.description || `${transaction.type} transaction`,
        date: transaction.created_at,
        status: 'completed', // Assuming completed since they're in the transactions table
      })) || [];
      
      set({
        stats,
        transactions,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      set({
        error: 'Failed to load dashboard data',
        loading: false,
      });
    }
  },
}));
