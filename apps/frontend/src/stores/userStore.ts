import type { Role } from '@sirena/common/constants';
import { create } from 'zustand';

export type UserState = {
  isLogged: boolean;
  role: Role | null;
  updateIsLogged: (isLogged: boolean) => void;
  setRole: (role: Role | null) => void;
  logout: () => void;
};

const isLoggedTokenName = import.meta.env.VITE_IS_LOGGED_TOKEN_NAME;

export const useUserStore = create<UserState>((set) => ({
  isLogged: isLoggedTokenName ? document.cookie.includes(isLoggedTokenName) : false,
  role: null,
  setRole: (role: Role | null) => set(() => ({ role })),
  updateIsLogged: (isLogged: boolean) => set(() => ({ isLogged })),
  logout: () =>
    set(() => ({
      isLogged: false,
      role: null,
    })),
}));
