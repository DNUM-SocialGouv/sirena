import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { client } from '@/lib/api/hc';
import { useDeclarantCreate } from './useDeclarantCreate';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}));

vi.mock('@/lib/api/saveError', () => ({
  notifySaveNetworkFailure: vi.fn(),
}));

vi.mock('@/lib/api/hc', () => ({
  client: { 'requetes-entite': { $post: vi.fn() } },
}));

vi.mock('@/lib/api/tanstackQuery', () => ({
  HttpError: class HttpError extends Error {},
  handleRequestErrors: vi.fn(),
}));

const post = vi.mocked(client['requetes-entite'].$post);

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

const renderCreate = () => renderHook(() => useDeclarantCreate(), { wrapper }).result;

describe('useDeclarantCreate', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // The data is saved: nothing is left to lose, so the redirect must not ask for confirmation.
  it('opens the created request without the unsaved changes confirmation', async () => {
    post.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: 'req-1' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as never,
    );

    await renderCreate().current.handleSave({ prenom: 'Ada' }, true);

    expect(navigate).toHaveBeenCalledWith({
      to: '/request/$requestId',
      params: { requestId: 'req-1' },
      ignoreBlocker: true,
    });
  });

  it('returns to the new request without the unsaved changes confirmation when nothing was entered', async () => {
    await renderCreate().current.handleSave({}, false);

    expect(post).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith({ to: '/request/create', ignoreBlocker: true });
  });
});
