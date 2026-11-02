import { useBlocker } from '@tanstack/react-router';
import { useRef } from 'react';
import { useUnsavedChangesStore } from '@/stores/unsavedChangesStore';

type UnsavedChangesGuardOptions = {
  isDirty: boolean;
};

export const useUnsavedChangesGuard = ({ isDirty }: UnsavedChangesGuardOptions) => {
  // The blocker reads the latest value when a navigation starts, not the one of its first render.
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  useBlocker({
    shouldBlockFn: async () => {
      if (!isDirtyRef.current) return false;
      const canLeave = await useUnsavedChangesStore.getState().requestLeave();
      return !canLeave;
    },
    enableBeforeUnload: false,
  });
};
