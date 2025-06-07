
import { create } from 'zustand';

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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUsers: User[] = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+234 801 234 5678',
          joinDate: '2024-01-15',
          collections: 3,
          totalRaised: 150000,
          status: 'active'
        },
        // Add more mock users as needed
      ];
      
      set({
        users: mockUsers,
        loading: false,
      });
    } catch (error) {
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
