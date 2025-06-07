
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

      // Get collection stats for each user
      const usersWithStats = await Promise.all(
        profilesData?.map(async (profile: any) => {
          // Get collections count
          const { count: collectionsCount } = await supabase
            .from('collections')
            .select('*', { count: 'exact', head: true })
            .eq('organizer_id', profile.id)
            .is('deleted_at', null);

          // Get total raised amount
          const { data: collectionsData } = await supabase
            .from('collections')
            .select('total_amount')
            .eq('organizer_id', profile.id)
            .is('deleted_at', null);

          const totalRaised = collectionsData?.reduce((sum, collection) => 
            sum + (Number(collection.total_amount) || 0), 0
          ) || 0;

          return {
            id: profile.id,
            name: profile.full_name,
            email: profile.email,
            phone: profile.phone_number || '',
            joinDate: profile.created_at,
            collections: collectionsCount || 0,
            totalRaised,
            status: 'active' as const, // We don't have an inactive status in the schema yet
          };
        }) || []
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
