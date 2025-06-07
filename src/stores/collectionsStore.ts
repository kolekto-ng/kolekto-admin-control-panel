
import { create } from 'zustand';

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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockCollections: Collection[] = [
        {
          id: '1',
          title: 'Medical Fund for Sarah',
          description: 'Help Sarah with her medical expenses',
          organizer: 'John Doe',
          targetAmount: 500000,
          raisedAmount: 325000,
          contributors: 45,
          status: 'active',
          deadline: '2024-12-31',
          createdAt: '2024-01-15'
        },
        // Add more mock collections as needed
      ];
      
      set({
        collections: mockCollections,
        loading: false,
      });
    } catch (error) {
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
