
import { create } from 'zustand';

export interface Withdrawal {
  id: string;
  collectionId: string;
  collectionName: string;
  hostName: string;
  hostEmail: string;
  requestedAmount: number;
  dateRequested: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface WithdrawalsState {
  withdrawals: Withdrawal[];
  loading: boolean;
  error: string | null;
  fetchWithdrawals: () => Promise<void>;
  getWithdrawalById: (id: string) => Withdrawal | undefined;
}

export const useWithdrawalsStore = create<WithdrawalsState>((set, get) => ({
  withdrawals: [],
  loading: false,
  error: null,

  fetchWithdrawals: async () => {
    set({ loading: true, error: null });
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockWithdrawals: Withdrawal[] = [
        {
          id: '1',
          collectionId: '1',
          collectionName: 'Medical Fund for Sarah',
          hostName: 'John Doe',
          hostEmail: 'john@example.com',
          requestedAmount: 250000,
          dateRequested: '2024-01-20',
          status: 'pending'
        },
        {
          id: '2',
          collectionId: '2',
          collectionName: 'School Building Project',
          hostName: 'Jane Smith',
          hostEmail: 'jane@example.com',
          requestedAmount: 500000,
          dateRequested: '2024-01-18',
          status: 'approved'
        },
        // Add more mock withdrawals as needed
      ];
      
      set({
        withdrawals: mockWithdrawals,
        loading: false,
      });
    } catch (error) {
      set({
        error: 'Failed to load withdrawals',
        loading: false,
      });
    }
  },

  getWithdrawalById: (id: string) => {
    return get().withdrawals.find(withdrawal => withdrawal.id === id);
  },
}));
