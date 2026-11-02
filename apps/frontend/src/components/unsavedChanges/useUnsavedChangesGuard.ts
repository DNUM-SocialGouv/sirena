import { useBlocker } from '@tanstack/react-router';
import { useRef } from 'react';
import { useUnsavedChangesStore } from '@/stores/unsavedChangesStore';

// An expired session or an inactive account can no longer save: asking would only trap the user.
const PATHS_LEFT_WITHOUT_CONFIRMATION = new Set(['/login', '/inactive']);

type UnsavedChangesGuardOptions = {
  isDirty: boolean;
};

export const useUnsavedChangesGuard = ({ isDirty }: UnsavedChangesGuardOptions) => {
  // The blocker reads the latest value when a navigation starts, not the one of its first render.
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  useBlocker({
    shouldBlockFn: async ({ next }) => {
      if (!isDirtyRef.current) return false;
      if (PATHS_LEFT_WITHOUT_CONFIRMATION.has(next.pathname)) return false;

      const canLeave = await useUnsavedChangesStore.getState().requestLeave();

      return !canLeave;
    },
    enableBeforeUnload: false,
  });
};
