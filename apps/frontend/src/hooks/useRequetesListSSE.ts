import { type RequeteUpdatedEvent, type RequeteUpdateField, SSE_EVENT_TYPES } from '@sirena/common/constants';
import { useCallback } from 'react';
import { useSSE } from './useSSE';

interface UseRequetesListSSEOptions {
  enabled?: boolean;
  onUpdate?: (data: RequeteUpdatedEvent) => void;
}

export function useRequetesListSSE(options: UseRequetesListSSEOptions = {}) {
  const { enabled = true, onUpdate } = options;

  const handleMessage = useCallback(
    (data: RequeteUpdatedEvent) => {
      onUpdate?.(data);
    },
    [onUpdate],
  );

  return useSSE<RequeteUpdatedEvent>({
    url: '/api/sse/requetes',
    eventType: SSE_EVENT_TYPES.REQUETE_UPDATED,
    onMessage: handleMessage,
    enabled,
  });
}

export type { RequeteUpdateField, RequeteUpdatedEvent };
