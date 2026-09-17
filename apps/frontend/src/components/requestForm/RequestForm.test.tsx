import type { RequeteMessageEvent } from '@sirena/common/constants';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestForm } from './RequestForm';

const REQUEST_ID = 'REQ-1';
const MESSAGES_KEY = ['requeteMessages', REQUEST_ID];

const toastAdd = vi.fn();

let discussionFeatureEnabled = true;
let emitDiscussionEvent: ((event: RequeteMessageEvent) => void) | null = null;

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/home">{children}</a>,
  useNavigate: () => vi.fn(),
}));

vi.mock('@/components/requestId/details', () => ({
  Details: () => <div data-testid="details-panel" />,
}));

vi.mock('@/components/requestId/processing', () => ({
  Processing: () => <div data-testid="processing-panel" />,
}));

vi.mock('@/components/requestId/discussion/Discussion', () => ({
  Discussion: () => <div data-testid="discussion-panel" />,
}));

vi.mock('@/components/requestId/requestInfos', () => ({
  RequestInfos: () => <div data-testid="request-infos" />,
}));

vi.mock('@/hooks/queries/useRequeteDetails', () => ({
  useRequeteDetails: () => ({ data: undefined, isLoading: false, isError: false }),
}));

vi.mock('@/hooks/useRequeteStatusSSE', () => ({
  useRequeteStatusSSE: () => ({ isConnected: true }),
}));

vi.mock('@/hooks/useRequeteMessagesSSE', () => ({
  useRequeteMessagesSSE: ({
    enabled,
    onMessage,
  }: {
    enabled?: boolean;
    onMessage: (event: RequeteMessageEvent) => void;
  }) => {
    if (enabled) emitDiscussionEvent = onMessage;
    return { isConnected: !!enabled };
  },
}));

const { fetchRequeteMessages } = vi.hoisted(() => ({ fetchRequeteMessages: vi.fn() }));

vi.mock('@/lib/api/requeteMessages', () => ({ fetchRequeteMessages }));

vi.mock('@/hooks/useHasFeature', () => ({
  useHasFeature: () => discussionFeatureEnabled,
}));

vi.mock('@sirena/ui', async (importOriginal) => {
  const original = await importOriginal<typeof import('@sirena/ui')>();
  return {
    ...original,
    Toast: {
      ...original.Toast,
      useToastManager: () => ({ add: toastAdd }),
    },
  };
});

const createdEvent = (): RequeteMessageEvent => ({
  action: 'created',
  requeteId: REQUEST_ID,
  entiteId: 'E1',
  entiteIds: ['E1'],
  messageId: 'M1',
});

const readEvent = (userId: string): RequeteMessageEvent => ({
  action: 'read',
  requeteId: REQUEST_ID,
  entiteId: 'E1',
  entiteIds: ['E1'],
  messageIds: ['M1'],
  userId,
});

const makeMessage = (id: string, isReadByCurrentUser = true) => ({
  id,
  requeteId: REQUEST_ID,
  contenu: `Message ${id}`,
  createdAt: '2026-01-01T10:00:00.000Z',
  entite: { id: 'E1', nomComplet: 'ARS', entiteTypeId: 'ARS' },
  author: { prenom: 'Jean', nom: 'Dupont' },
  isReadByCurrentUser,
});

const page = (ids: string[], nextCursor: string | null = null) => ({
  data: ids.map((id) => makeMessage(id)),
  meta: { hasMore: nextCursor !== null, nextCursor },
});

const seededCache = () => ({
  pages: [page(['M3', 'M2'], 'M2'), page(['M1'])],
  pageParams: [undefined, 'M2'],
});

const renderForm = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

  render(
    <QueryClientProvider client={queryClient}>
      <RequestForm requestId={REQUEST_ID} />
    </QueryClientProvider>,
  );

  return { queryClient, invalidateQueries };
};

const cachedIds = (queryClient: QueryClient) =>
  queryClient
    .getQueryData<ReturnType<typeof seededCache>>(MESSAGES_KEY)
    ?.pages.map((cachedPage) => cachedPage.data.map((message) => message.id));

const invalidatedKeys = (invalidateQueries: ReturnType<typeof vi.spyOn>) =>
  invalidateQueries.mock.calls.map((call: unknown[]) => (call[0] as { queryKey?: unknown } | undefined)?.queryKey);

describe('RequestForm', () => {
  beforeEach(() => {
    discussionFeatureEnabled = true;
    emitDiscussionEvent = null;
    toastAdd.mockReset();
    fetchRequeteMessages.mockReset();
  });

  it('keeps the two historical tabs only: the discussion lives in a panel, not a tab', () => {
    renderForm();

    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.queryByRole('tab', { name: /Discussion/ })).not.toBeInTheDocument();
  });

  it('subscribes to the discussion stream only when the feature flag is on', () => {
    discussionFeatureEnabled = false;

    renderForm();

    expect(emitDiscussionEvent).toBeNull();
  });

  describe('on a new message, whoever posted it', () => {
    it('invalidates the messages when the discussion was never opened', async () => {
      const { invalidateQueries } = renderForm();
      invalidateQueries.mockClear();

      await act(async () => emitDiscussionEvent?.(createdEvent()));

      expect(invalidatedKeys(invalidateQueries)).toEqual([MESSAGES_KEY]);
      expect(fetchRequeteMessages).not.toHaveBeenCalled();
      expect(toastAdd).not.toHaveBeenCalled();
    });

    it('only fetches what is newer than the cached messages and prepends it to the first page', async () => {
      const { queryClient, invalidateQueries } = renderForm();
      queryClient.setQueryData(MESSAGES_KEY, seededCache());
      invalidateQueries.mockClear();
      fetchRequeteMessages.mockResolvedValueOnce({
        data: [makeMessage('M5', false), makeMessage('M4', false)],
        meta: { hasMore: false, nextCursor: null },
      });

      await act(async () => emitDiscussionEvent?.(createdEvent()));

      expect(fetchRequeteMessages).toHaveBeenCalledWith(REQUEST_ID, { after: 'M3' }, { silentToastError: true });
      await waitFor(() => expect(cachedIds(queryClient)).toEqual([['M5', 'M4', 'M3', 'M2'], ['M1']]));
      expect(invalidateQueries).not.toHaveBeenCalled();
      expect(queryClient.getQueryState(MESSAGES_KEY)?.isInvalidated).toBe(false);
    });

    it('keeps the read flags returned by the server on the inserted messages', async () => {
      const { queryClient } = renderForm();
      queryClient.setQueryData(MESSAGES_KEY, seededCache());
      fetchRequeteMessages.mockResolvedValueOnce({
        data: [makeMessage('M4', false)],
        meta: { hasMore: false, nextCursor: null },
      });

      await act(async () => emitDiscussionEvent?.(createdEvent()));

      await waitFor(() => expect(cachedIds(queryClient)?.[0]).toContain('M4'));
      const [firstPage] = queryClient.getQueryData<ReturnType<typeof seededCache>>(MESSAGES_KEY)?.pages ?? [];
      expect(firstPage?.data.find((message) => message.id === 'M4')?.isReadByCurrentUser).toBe(false);
    });

    it('does not duplicate a message already in cache', async () => {
      const { queryClient, invalidateQueries } = renderForm();
      queryClient.setQueryData(MESSAGES_KEY, seededCache());
      invalidateQueries.mockClear();
      fetchRequeteMessages.mockResolvedValueOnce({
        data: [makeMessage('M4'), makeMessage('M3')],
        meta: { hasMore: false, nextCursor: null },
      });

      await act(async () => emitDiscussionEvent?.(createdEvent()));

      await waitFor(() => expect(cachedIds(queryClient)).toEqual([['M4', 'M3', 'M2'], ['M1']]));
      expect(invalidateQueries).not.toHaveBeenCalled();
    });

    it('falls back to a full invalidation when more than one page of messages arrived', async () => {
      const { queryClient, invalidateQueries } = renderForm();
      queryClient.setQueryData(MESSAGES_KEY, seededCache());
      invalidateQueries.mockClear();
      fetchRequeteMessages.mockResolvedValueOnce({
        data: [makeMessage('M4')],
        meta: { hasMore: true, nextCursor: null },
      });

      await act(async () => emitDiscussionEvent?.(createdEvent()));

      await waitFor(() => expect(invalidatedKeys(invalidateQueries)).toContainEqual(MESSAGES_KEY));
      expect(cachedIds(queryClient)).toEqual([['M3', 'M2'], ['M1']]);
    });

    it('falls back to a full invalidation when the catch-up request fails', async () => {
      const { queryClient, invalidateQueries } = renderForm();
      queryClient.setQueryData(MESSAGES_KEY, seededCache());
      invalidateQueries.mockClear();
      fetchRequeteMessages.mockRejectedValueOnce(new Error('network'));

      await act(async () => emitDiscussionEvent?.(createdEvent()));

      await waitFor(() => expect(invalidatedKeys(invalidateQueries)).toContainEqual(MESSAGES_KEY));
      expect(cachedIds(queryClient)).toEqual([['M3', 'M2'], ['M1']]);
    });
  });

  it('ignores the read receipts: nothing to refresh in the thread itself', () => {
    const { invalidateQueries } = renderForm();
    invalidateQueries.mockClear();

    act(() => emitDiscussionEvent?.(readEvent('ME')));

    expect(invalidateQueries).not.toHaveBeenCalled();
    expect(fetchRequeteMessages).not.toHaveBeenCalled();
  });
});
