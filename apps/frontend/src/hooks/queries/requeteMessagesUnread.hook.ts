import { useQuery } from '@tanstack/react-query';
import { fetchRequeteUnreadCount } from '@/lib/api/requeteMessages';

export const requeteUnreadCountQueryKey = (requestId: string) => ['requeteMessagesUnreadCount', requestId] as const;

export const useRequeteUnreadCount = (requestId: string, enabled = true) =>
  useQuery({
    queryKey: requeteUnreadCountQueryKey(requestId),
    queryFn: () => fetchRequeteUnreadCount(requestId),
    enabled: enabled && !!requestId,
  });
