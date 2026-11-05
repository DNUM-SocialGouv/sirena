import { create } from 'zustand';

type UnsavedChangesState = {
  /** Resolves the confirmation the modal is currently asking for, if any. */
  pendingResolve: ((canLeave: boolean) => void) | null;
  /** Asks the user whether they want to leave without saving. Resolves `true` when they do. */
  requestLeave: () => Promise<boolean>;
  answer: (canLeave: boolean) => void;
  dirtyGuardIds: ReadonlySet<string>;
  setGuardDirty: (guardId: string, isDirty: boolean) => void;
  confirmLeave: () => Promise<boolean>;
};

export const useUnsavedChangesStore = create<UnsavedChangesState>((set, get) => ({
  pendingResolve: null,
  requestLeave: () =>
    new Promise<boolean>((resolve) => {
      // A newer request supersedes an unanswered one: the older caller stays where it is.
      get().pendingResolve?.(false);

      set({ pendingResolve: resolve });
    }),
  answer: (canLeave) => {
    const resolve = get().pendingResolve;
    if (!resolve) return;

    set({ pendingResolve: null });

    resolve(canLeave);
  },
  dirtyGuardIds: new Set(),
  setGuardDirty: (guardId, isDirty) => {
    const dirtyGuardIds = get().dirtyGuardIds;
    if (dirtyGuardIds.has(guardId) === isDirty) return;

    const next = new Set(dirtyGuardIds);
    if (isDirty) next.add(guardId);
    else next.delete(guardId);

    set({ dirtyGuardIds: next });
  },
  confirmLeave: async () => {
    if (get().dirtyGuardIds.size === 0) return true;

    return get().requestLeave();
  },
}));
