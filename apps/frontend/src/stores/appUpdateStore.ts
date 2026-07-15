import { create } from 'zustand';

export type AppUpdateState = {
  isUpdateAvailable: boolean;
  notifyUpdateAvailable: () => void;
  dismiss: () => void;
};

export const useAppUpdateStore = create<AppUpdateState>((set) => ({
  isUpdateAvailable: false,
  notifyUpdateAvailable: () => set({ isUpdateAvailable: true }),
  dismiss: () => set({ isUpdateAvailable: false }),
}));
