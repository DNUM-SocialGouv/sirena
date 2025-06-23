import type { fetchProfile } from '@/lib/api/fetcProfile';
import { create } from 'zustand';

type Profile = Awaited<ReturnType<typeof fetchProfile>>;

export type UserState = {
  isAdmin: boolean;
  isLogged: boolean;
  role: string | null;
  profile: Profile | null;
  updateIsAdmin: (isAdmin: boolean) => void;
  updateIsLogged: (isLogged: boolean) => void;
  setRole: (role: string | null) => void;
  setProfile: (profile: Profile | null) => void;
  logout: () => void;
};

const isLoggedTokenName = import.meta.env.VITE_IS_LOGGED_TOKEN_NAME;

export const useUserStore = create<UserState>((set) => ({
  // TODO use role
  isAdmin: true,
  isLogged: isLoggedTokenName ? document.cookie.includes(isLoggedTokenName) : false,
  profile: null,
  role: null,
  setProfile: (profile: Profile | null) => set(() => ({ profile })),
  setRole: (role: string | null) => set(() => ({ role })),
  updateIsAdmin: (isAdmin: boolean) => set(() => ({ isAdmin })),
  updateIsLogged: (isLogged: boolean) => set(() => ({ isLogged })),
  logout: () =>
    set(() => ({
      isAdmin: false,
      isLogged: false,
      profile: null,
      role: null,
    })),
}));
