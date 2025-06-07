
import { create } from 'zustand';
import { 
  fetchDashboardStats, 
  fetchRecentTransactions, 
  DashboardStats,
  Transaction 
} from '@/services/mockData';

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
      const [statsData, transactionsData] = await Promise.all([
        fetchDashboardStats(),
        fetchRecentTransactions()
      ]);
      
      set({
        stats: statsData,
        transactions: transactionsData,
        loading: false,
      });
    } catch (error) {
      set({
        error: 'Failed to load dashboard data',
        loading: false,
      });
    }
  },
}));
