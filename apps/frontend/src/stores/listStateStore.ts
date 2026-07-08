import { create } from 'zustand';
import type { QueryParams } from '@/schemas/pagination.schema';

/**
 * Remembers each list's UI state (pagination, filters, sort) plus the route it
 * was on, so detail pages can restore it on back-navigation. In-memory only.
 */
export type ListKey = 'requetes' | 'users' | 'entites';

export type ListState = {
  to: string;
  search: QueryParams;
};

type ListStateStore = {
  states: Partial<Record<ListKey, ListState>>;
  setListState: (key: ListKey, value: ListState) => void;
};

export const useListStateStore = create<ListStateStore>((set) => ({
  states: {},
  setListState: (key, value) => set((state) => ({ states: { ...state.states, [key]: value } })),
}));
