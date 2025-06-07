
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  collections: number;
  totalRaised: number;
  status: 'active' | 'inactive';
}

interface UsersState {
  users: User[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  getUserById: (id: string) => User | undefined;
}

export const useUsersStore = create<UsersState>((set, get) => ({
  users: [],
  loading: false,
  error: null,

  fetchUsers: async () => {
    set({ loading: true, error: null });
    
    try {
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (!profilesData) {
        set({ users: [], loading: false });
        return;
      }

      // Get collection stats for each user
      const usersWithStats = await Promise.all(
        profilesData.map(async (profile) => {
          // Get collections count
          const { count: collectionsCount } = await supabase
            .from('collections')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          // Get total raised amount from wallets (net_payment represents actual collected amount)
          const { data: walletsData } = await supabase
            .from('wallets')
            .select('net_payment, collection_id')
            .in('collection_id', 
              await supabase
                .from('collections')
                .select('id')
                .eq('user_id', profile.id)
                .then(({ data }) => data?.map(c => c.id) || [])
            );

          const totalRaised = walletsData?.reduce((sum, wallet) => 
            sum + (Number(wallet.net_payment) || 0), 0
          ) || 0;

          return {
            id: profile.id,
            name: profile.full_name || 'Unknown User',
            email: profile.email,
            phone: profile.phone_number || '',
            joinDate: profile.created_at || '',
            collections: collectionsCount || 0,
            totalRaised,
            status: 'active' as const,
          };
        })
      );
      
      set({
        users: usersWithStats,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      set({
        error: 'Failed to load users',
        loading: false,
      });
    }
  },

  getUserById: (id: string) => {
    return get().users.find(user => user.id === id);
  },
}));
