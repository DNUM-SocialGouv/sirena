import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { client } from '@/lib/api/hc';
import { useSituationCreate } from './useSituationCreate';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}));

vi.mock('@/lib/api/saveError', () => ({
  notifySaveNetworkFailure: vi.fn(),
}));

vi.mock('@/lib/api/fetchUploadedFiles', () => ({
  uploadFile: vi.fn(),
}));

vi.mock('@/lib/api/hc', () => ({
  client: { 'requetes-entite': { $post: vi.fn(), ':id': { situation: { $post: vi.fn() } } } },
}));

vi.mock('@/lib/api/tanstackQuery', () => ({
  HttpError: class HttpError extends Error {},
  handleRequestErrors: vi.fn(async (response: Response) => {
    if (!response.ok) throw new Error('boom');
  }),
}));

const createRequest = vi.mocked(client['requetes-entite'].$post);
const createSituation = vi.mocked(client['requetes-entite'][':id'].situation.$post);

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }) as never;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

const renderCreate = () => renderHook(() => useSituationCreate(), { wrapper }).result;

describe('useSituationCreate', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('opens the created request without the unsaved changes confirmation', async () => {
    createRequest.mockResolvedValueOnce(jsonResponse({ data: { id: 'req-1' } }));
    createSituation.mockResolvedValueOnce(jsonResponse({ data: { id: 'req-1' }, shouldCloseRequeteStatus: null }));

    await renderCreate().current.handleSave({ fait: { commentaire: 'Chute' } }, true, []);

    expect(navigate).toHaveBeenCalledWith({
      to: '/request/$requestId',
      params: { requestId: 'req-1' },
      ignoreBlocker: true,
    });
  });

  // The request already exists: staying on the creation form would create a second one on the next save.
  it('opens the created request without the unsaved changes confirmation when its situation failed to save', async () => {
    createRequest.mockResolvedValueOnce(jsonResponse({ data: { id: 'req-1' } }));
    createSituation.mockResolvedValueOnce(jsonResponse({}, 500));

    await expect(renderCreate().current.handleSave({ fait: { commentaire: 'Chute' } }, true, [])).rejects.toThrow();

    expect(navigate).toHaveBeenCalledWith({
      to: '/request/$requestId',
      params: { requestId: 'req-1' },
      ignoreBlocker: true,
    });
  });

  it('returns to the new request without the unsaved changes confirmation when nothing was entered', async () => {
    await renderCreate().current.handleSave({}, false, []);

    expect(createRequest).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith({ to: '/request/create', ignoreBlocker: true });
  });
});
