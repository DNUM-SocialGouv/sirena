import { create } from 'zustand';

export type UserState = {
  isAdmin: boolean;
  isLogged: boolean;
  updateIsAdmin: (isAdmin: boolean) => void;
  updateIsLogged: (isLogged: boolean) => void;
};

export const useUserStore = create<UserState>((set) => ({
  isAdmin: false,
  isLogged: false,
  updateIsAdmin: (isAdmin: boolean) => set(() => ({ isAdmin })),
  updateIsLogged: (isLogged: boolean) => set(() => ({ isLogged })),
}));
