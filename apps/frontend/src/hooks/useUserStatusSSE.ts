import { SSE_EVENT_TYPES, type UserStatusEvent } from '@sirena/common/constants';
import { useCallback } from 'react';
import { useSSE } from './useSSE';

interface UseUserStatusSSEOptions {
  enabled?: boolean;
  onStatusChange?: (data: UserStatusEvent) => void;
}

export function useUserStatusSSE(options: UseUserStatusSSEOptions = {}) {
  const { enabled = true, onStatusChange } = options;

  const handleMessage = useCallback(
    (data: UserStatusEvent) => {
      onStatusChange?.(data);
    },
    [onStatusChange],
  );

  return useSSE<UserStatusEvent>({
    url: '/api/sse/profile',
    eventType: SSE_EVENT_TYPES.USER_STATUS,
    onMessage: handleMessage,
    enabled,
  });
}
