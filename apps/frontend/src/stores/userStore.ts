import type { Role } from '@sirena/common/constants';
import { create } from 'zustand';
import { LOGGED_TOKEN_NAME } from '@/config/token.constant';

export type UserState = {
  isLogged: boolean;
  role: Role | null;
  updateIsLogged: (isLogged: boolean) => void;
  setRole: (role: Role | null) => void;
  logout: () => void;
};

export const useUserStore = create<UserState>((set) => ({
  isLogged: LOGGED_TOKEN_NAME ? document.cookie.includes(LOGGED_TOKEN_NAME) : false,
  role: null,
  setRole: (role: Role | null) => set(() => ({ role })),
  updateIsLogged: (isLogged: boolean) => set(() => ({ isLogged })),
  logout: () =>
    set(() => ({
      isLogged: false,
      role: null,
    })),
}));
