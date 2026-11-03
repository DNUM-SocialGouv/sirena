import { useBlocker } from '@tanstack/react-router';
import { useCallback, useEffect, useId, useRef } from 'react';
import { useUnsavedChangesStore } from '@/stores/unsavedChangesStore';

const PATHS_LEFT_WITHOUT_CONFIRMATION = new Set(['/login', '/inactive']);

type UnsavedChangesGuardOptions = {
  isDirty: boolean;
};

export const useUnsavedChangesGuard = ({ isDirty }: UnsavedChangesGuardOptions) => {
  // The blocker reads the latest value when a navigation starts, not the one of its first render.
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const guardId = useId();

  useEffect(() => {
    const { setGuardDirty } = useUnsavedChangesStore.getState();
    setGuardDirty(guardId, isDirty);

    return () => setGuardDirty(guardId, false);
  }, [guardId, isDirty]);

  useBlocker({
    shouldBlockFn: async ({ next }) => {
      if (!isDirtyRef.current) return false;
      if (PATHS_LEFT_WITHOUT_CONFIRMATION.has(next.pathname)) return false;

      const canLeave = await useUnsavedChangesStore.getState().requestLeave();

      return !canLeave;
    },
    enableBeforeUnload: false,
  });

  const confirmLeave = useCallback(async () => {
    if (!isDirtyRef.current) return true;

    return useUnsavedChangesStore.getState().requestLeave();
  }, []);

  return { confirmLeave };
};
