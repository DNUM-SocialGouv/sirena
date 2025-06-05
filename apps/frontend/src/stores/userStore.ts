import { create } from 'zustand';

export type UserState = {
  isAdmin: boolean;
  isLogged: boolean;
  updateIsAdmin: (isAdmin: boolean) => void;
  updateIsLogged: (isLogged: boolean) => void;
};

const isLoggedTokenName = import.meta.env.VITE_IS_LOGGED_TOKEN_NAME;

export const useUserStore = create<UserState>((set) => ({
  isAdmin: true,
  isLogged: isLoggedTokenName ? document.cookie.includes(isLoggedTokenName) : false,
  updateIsAdmin: (isAdmin: boolean) => set(() => ({ isAdmin })),
  updateIsLogged: (isLogged: boolean) => set(() => ({ isLogged })),
}));
