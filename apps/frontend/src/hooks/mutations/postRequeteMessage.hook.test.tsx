import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { requeteUnreadCountQueryKey } from '@/hooks/queries/requeteMessagesUnread.hook';
import { useMarkRequeteDiscussionRead } from './markRequeteDiscussionRead.hook';
import { usePostRequeteMessage } from './postRequeteMessage.hook';

const postRequeteMessage = vi.fn();
const markRequeteDiscussionRead = vi.fn();

vi.mock('@/lib/api/requeteMessages', () => ({
  postRequeteMessage: (...args: unknown[]) => postRequeteMessage(...args),
  markRequeteDiscussionRead: (...args: unknown[]) => markRequeteDiscussionRead(...args),
  fetchRequeteUnreadCount: () => Promise.resolve(1),
}));

const renderWithClient = <T,>(hook: () => T) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, ...renderHook(hook, { wrapper }) };
};

describe('discussion mutations and the unread count', () => {
  it('refetches the count after posting instead of forcing it to zero', async () => {
    postRequeteMessage.mockResolvedValue({ id: 'M1' });
    const { queryClient, result } = renderWithClient(() => usePostRequeteMessage('REQ'));
    // A message that arrived while the reply was in flight: it must survive the answer.
    queryClient.setQueryData(requeteUnreadCountQueryKey('REQ'), 1);
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    await result.current.mutateAsync({ contenu: 'Bonjour' });

    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: requeteUnreadCountQueryKey('REQ') }),
    );
    expect(queryClient.getQueryData(requeteUnreadCountQueryKey('REQ'))).not.toBe(0);
  });

  it('refetches the count after marking the thread read instead of trusting the answer', async () => {
    markRequeteDiscussionRead.mockResolvedValue({ unreadCount: 0 });
    const { queryClient, result } = renderWithClient(() => useMarkRequeteDiscussionRead('REQ'));
    queryClient.setQueryData(requeteUnreadCountQueryKey('REQ'), 1);
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    await result.current.mutateAsync();

    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: requeteUnreadCountQueryKey('REQ') }),
    );
    expect(queryClient.getQueryData(requeteUnreadCountQueryKey('REQ'))).not.toBe(0);
  });
});
