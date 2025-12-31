import { type RequeteUpdatedEvent, SSE_EVENT_TYPES } from '@sirena/common/constants';
import { useCallback } from 'react';
import { useSSE } from './useSSE';

interface UseRequeteStatusSSEOptions {
  requeteId: string;
  enabled?: boolean;
  onUpdate?: (data: RequeteUpdatedEvent) => void;
}

export function useRequeteStatusSSE(options: UseRequeteStatusSSEOptions) {
  const { requeteId, enabled = true, onUpdate } = options;

  const handleMessage = useCallback(
    (data: RequeteUpdatedEvent) => {
      onUpdate?.(data);
    },
    [onUpdate],
  );

  return useSSE<RequeteUpdatedEvent>({
    url: `/api/sse/requetes/${requeteId}`,
    eventType: SSE_EVENT_TYPES.REQUETE_UPDATED,
    onMessage: handleMessage,
    enabled: enabled && !!requeteId,
  });
}
