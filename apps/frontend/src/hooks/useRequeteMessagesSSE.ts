import { type RequeteMessageEvent, SSE_EVENT_TYPES } from '@sirena/common/constants';
import { useSSE } from './useSSE';

interface UseRequeteMessagesSSEOptions {
  requeteId: string;
  enabled?: boolean;
  onMessage: (event: RequeteMessageEvent) => void;
}

export function useRequeteMessagesSSE(options: UseRequeteMessagesSSEOptions) {
  const { requeteId, enabled = true, onMessage } = options;

  return useSSE<RequeteMessageEvent>({
    url: `/api/sse/requetes/${requeteId}/messages`,
    eventType: SSE_EVENT_TYPES.REQUETE_MESSAGE,
    onMessage,
    enabled: enabled && !!requeteId,
  });
}
