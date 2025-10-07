import type { Role, StatutType } from '@sirena/common/constants';
import { create } from 'zustand';
import { LOGGED_TOKEN_NAME } from '@/config/token.constant';

export type UserState = {
  isLogged: boolean;
  role: Role | null;
  statutId: StatutType | null;
  updateIsLogged: (isLogged: boolean) => void;
  setRole: (role: Role | null) => void;
  setStatutId: (statutId: StatutType | null) => void;
  logout: () => void;
};

export const useUserStore = create<UserState>((set) => {
  const cookieName = LOGGED_TOKEN_NAME || 'is_logged_token';
  const initialIsLogged = document.cookie.includes(cookieName);

  return {
    isLogged: initialIsLogged,
    role: null,
    statutId: null,
    setRole: (role: Role | null) => set(() => ({ role })),
    setStatutId: (statutId: StatutType | null) => set(() => ({ statutId })),
    updateIsLogged: (isLogged: boolean) => set(() => ({ isLogged })),
    logout: () =>
      set(() => ({
        isLogged: false,
        role: null,
        statutId: null,
      })),
  };
});
