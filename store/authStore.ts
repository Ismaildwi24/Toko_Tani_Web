import { create } from 'zustand';
import { User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: 'customer' | 'petani' | 'admin';
  status: 'active' | 'suspended' | 'blocked';
  store_name?: string | null;
  store_location?: string | null;
  created_at: string;
}

interface AuthStore {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  setSession: (user: User | null, profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  profile: null,
  loading: true,
  setSession: (user, profile) => set({ user, profile, loading: false }),
  setLoading: (loading) => set({ loading }),
  clearSession: () => set({ user: null, profile: null, loading: false }),
}));
