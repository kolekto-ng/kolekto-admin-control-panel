
import { create } from 'zustand';

export interface Withdrawal {
  id: string;
  collectionId: string;
  collectionTitle: string;
  organizer: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  bankName: string;
  accountNumber: string;
  accountName: string;
  requestDate: string;
  processedDate?: string;
  reason?: string;
}

interface WithdrawalsState {
  withdrawals: Withdrawal[];
  loading: boolean;
  error: string | null;
  fetchWithdrawals: () => Promise<void>;
  getWithdrawalById: (id: string) => Withdrawal | undefined;
  updateWithdrawalStatus: (id: string, status: 'approved' | 'rejected', reason?: string) => Promise<void>;
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
          collectionTitle: 'Medical Fund for Sarah',
          organizer: 'John Doe',
          amount: 100000,
          status: 'pending',
          bankName: 'First Bank',
          accountNumber: '1234567890',
          accountName: 'John Doe',
          requestDate: '2024-01-20'
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

  updateWithdrawalStatus: async (id: string, status: 'approved' | 'rejected', reason?: string) => {
    set({ loading: true });
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const withdrawals = get().withdrawals.map(withdrawal =>
        withdrawal.id === id
          ? {
              ...withdrawal,
              status,
              processedDate: new Date().toISOString(),
              reason,
            }
          : withdrawal
      );
      
      set({
        withdrawals,
        loading: false,
      });
    } catch (error) {
      set({
        error: 'Failed to update withdrawal status',
        loading: false,
      });
    }
  },
}));
