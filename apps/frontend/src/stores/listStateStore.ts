import { create } from 'zustand';
import type { QueryParams } from '@/schemas/pagination.schema';

/** Remembers each table's last state so detail pages can restore it on back-navigation. In-memory only. */
export type ListKey = 'requetes' | 'users' | 'entites';

export type ListLocation = {
  to: string;
  search: QueryParams;
};

type ListStateStore = {
  locations: Partial<Record<ListKey, ListLocation>>;
  setListLocation: (key: ListKey, location: ListLocation) => void;
};

export const useListStateStore = create<ListStateStore>((set) => ({
  locations: {},
  setListLocation: (key, location) => set((state) => ({ locations: { ...state.locations, [key]: location } })),
}));
