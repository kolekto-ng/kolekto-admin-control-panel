
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface Withdrawal {
  id: string;
  collectionId: string;
  collectionName?: string;
  hostName: string;
  hostEmail: string;
  requestedAmount: number;
  dateRequested: string;
  status: 'pending' | 'approved' | 'rejected';
  bankName: string;
  accountNumber: string;
  accountName: string;
}

interface WithdrawalsState {
  withdrawals: Withdrawal[];
  loading: boolean;
  error: string | null;
  fetchWithdrawals: () => Promise<void>;
  getWithdrawalById: (id: string) => Withdrawal | undefined;
  approveWithdrawal: (id: string) => Promise<void>;
  rejectWithdrawal: (id: string) => Promise<void>;
}

export const useWithdrawalsStore = create<WithdrawalsState>((set, get) => ({
  withdrawals: [],
  loading: false,
  error: null,

  fetchWithdrawals: async () => {
    set({ loading: true, error: null });
    
    try {
      const { data: withdrawalsData, error } = await supabase
        .from('withdrawals')
        .select(`
          *,
          collections (
            title,
            organizer_id
          ),
          profiles!withdrawals_organizer_id_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const formattedWithdrawals: Withdrawal[] = withdrawalsData?.map((withdrawal: any) => ({
        id: withdrawal.id,
        collectionId: withdrawal.collection_id,
        collectionName: withdrawal.collections?.title || 'Unknown Collection',
        hostName: withdrawal.profiles?.full_name || 'Unknown Host',
        hostEmail: withdrawal.profiles?.email || 'unknown@example.com',
        requestedAmount: withdrawal.amount,
        dateRequested: withdrawal.created_at,
        status: withdrawal.status,
        bankName: withdrawal.bank_name,
        accountNumber: withdrawal.account_number,
        accountName: withdrawal.account_name,
      })) || [];
      
      set({
        withdrawals: formattedWithdrawals,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      set({
        error: 'Failed to load withdrawals',
        loading: false,
      });
    }
  },

  getWithdrawalById: (id: string) => {
    return get().withdrawals.find(withdrawal => withdrawal.id === id);
  },

  approveWithdrawal: async (id: string) => {
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Update local state
      set(state => ({
        withdrawals: state.withdrawals.map(withdrawal =>
          withdrawal.id === id ? { ...withdrawal, status: 'approved' as const } : withdrawal
        )
      }));
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      set({ error: 'Failed to approve withdrawal' });
    }
  },

  rejectWithdrawal: async (id: string) => {
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Update local state
      set(state => ({
        withdrawals: state.withdrawals.map(withdrawal =>
          withdrawal.id === id ? { ...withdrawal, status: 'rejected' as const } : withdrawal
        )
      }));
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      set({ error: 'Failed to reject withdrawal' });
    }
  },
}));
