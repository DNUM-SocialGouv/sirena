import { create } from 'zustand';

export type FeatureFlagState = {
  flags: Record<string, boolean>;
  setFlags: (flags: Record<string, boolean>) => void;
};

export const useFeatureFlagStore = create<FeatureFlagState>((set) => ({
  flags: {},
  setFlags: (flags: Record<string, boolean>) => set({ flags }),
}));
