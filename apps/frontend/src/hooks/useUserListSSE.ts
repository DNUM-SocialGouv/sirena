import { SSE_EVENT_TYPES, type UserListEvent } from '@sirena/common/constants';
import { useCallback } from 'react';
import { useSSE } from './useSSE';

interface UseUserListSSEOptions {
  enabled?: boolean;
  onUserListChange?: (data: UserListEvent) => void;
}

export function useUserListSSE(options: UseUserListSSEOptions = {}) {
  const { enabled = true, onUserListChange } = options;

  const handleMessage = useCallback(
    (data: UserListEvent) => {
      onUserListChange?.(data);
    },
    [onUserListChange],
  );

  return useSSE<UserListEvent>({
    url: '/api/sse/users',
    eventType: SSE_EVENT_TYPES.USER_LIST,
    onMessage: handleMessage,
    enabled,
  });
}
