import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AuthState = {
  token: string | null;
  setToken: (token: string) => void;
  clearToken: () => void;

  username: string | null;
  setUsername: (name: string) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
      clearToken: () => set({ token: null, username: null }),

      username: null,
      setUsername: (name) => set({ username: name }),
    }),
    {
      name: 'auth-storage',
    },
  ),
);
