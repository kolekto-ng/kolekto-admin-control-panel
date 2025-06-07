
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface Collection {
  id: string;
  title: string;
  description: string;
  organizer: string;
  targetAmount: number;
  raisedAmount: number;
  contributors: number;
  status: 'active' | 'completed' | 'paused';
  deadline: string;
  createdAt: string;
}

interface CollectionsState {
  collections: Collection[];
  loading: boolean;
  error: string | null;
  fetchCollections: () => Promise<void>;
  getCollectionById: (id: string) => Collection | undefined;
}

export const useCollectionsStore = create<CollectionsState>((set, get) => ({
  collections: [],
  loading: false,
  error: null,

  fetchCollections: async () => {
    set({ loading: true, error: null });
    
    try {
      const { data: collectionsData, error } = await supabase
        .from('collections')
        .select(`
          *,
          profiles!collections_organizer_id_fkey (
            full_name
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Get contributors count for each collection
      const collectionsWithStats = await Promise.all(
        collectionsData?.map(async (collection: any) => {
          const { count } = await supabase
            .from('contributions')
            .select('*', { count: 'exact', head: true })
            .eq('collection_id', collection.id)
            .eq('status', 'paid');

          return {
            id: collection.id,
            title: collection.title,
            description: collection.description || '',
            organizer: collection.profiles?.full_name || 'Unknown Organizer',
            targetAmount: Number(collection.amount),
            raisedAmount: Number(collection.total_amount || 0),
            contributors: count || 0,
            status: collection.status,
            deadline: collection.deadline || '',
            createdAt: collection.created_at,
          };
        }) || []
      );
      
      set({
        collections: collectionsWithStats,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching collections:', error);
      set({
        error: 'Failed to load collections',
        loading: false,
      });
    }
  },

  getCollectionById: (id: string) => {
    return get().collections.find(collection => collection.id === id);
  },
}));
