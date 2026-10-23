import type { Role, StatutType } from '@sirena/common/constants';
import { create } from 'zustand';
import { LOGGED_TOKEN_NAME } from '@/config/token.constant';

export type UserState = {
  isLogged: boolean;
  role: Role | null;
  statutId: StatutType | null;
  cguAcceptedVersion: string | null;
  // Kept for the session only: a reload presents the CGU modal again, as a new login does
  hasRefusedCgu: boolean;
  updateIsLogged: (isLogged: boolean) => void;
  setRole: (role: Role | null) => void;
  setStatutId: (statutId: StatutType | null) => void;
  setCguAcceptedVersion: (cguAcceptedVersion: string | null) => void;
  setHasRefusedCgu: (hasRefusedCgu: boolean) => void;
  logout: () => void;
};

export const useUserStore = create<UserState>((set) => {
  const cookieName = LOGGED_TOKEN_NAME || 'is_logged_token';
  const initialIsLogged = document.cookie.includes(cookieName);

  return {
    isLogged: initialIsLogged,
    role: null,
    statutId: null,
    cguAcceptedVersion: null,
    hasRefusedCgu: false,
    setRole: (role: Role | null) => set(() => ({ role })),
    setStatutId: (statutId: StatutType | null) => set(() => ({ statutId })),
    setCguAcceptedVersion: (cguAcceptedVersion: string | null) => set(() => ({ cguAcceptedVersion })),
    setHasRefusedCgu: (hasRefusedCgu: boolean) => set(() => ({ hasRefusedCgu })),
    updateIsLogged: (isLogged: boolean) => set(() => ({ isLogged })),
    logout: () =>
      set(() => ({
        isLogged: false,
        role: null,
        statutId: null,
        cguAcceptedVersion: null,
        hasRefusedCgu: false,
      })),
  };
});
