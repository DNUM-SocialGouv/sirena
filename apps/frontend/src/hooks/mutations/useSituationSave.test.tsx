import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadFile } from '@/lib/api/fetchUploadedFiles';
import { client } from '@/lib/api/hc';
import { notifySaveNetworkFailure } from '@/lib/api/saveError';
import { HttpError } from '@/lib/api/tanstackQuery';
import { useSituationSave } from './useSituationSave';

vi.mock('@/lib/api/saveError', () => ({
  notifySaveNetworkFailure: vi.fn(),
}));

vi.mock('@/lib/api/fetchUploadedFiles', () => ({
  uploadFile: vi.fn(),
}));

vi.mock('@/hooks/queries/profile.hook', () => ({
  useProfile: () => ({ data: { topEntiteId: 'entite-1' } }),
  profileQueryOptions: vi.fn(),
}));

vi.mock('@/lib/api/hc', () => ({
  client: { 'requetes-entite': { ':id': { situation: { $post: vi.fn() } } } },
}));

vi.mock('@/lib/api/tanstackQuery', () => {
  class HttpError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'HttpError';
    }
  }
  return {
    HttpError,
    handleRequestErrors: vi.fn(async (response: Response) => {
      if (!response.ok) throw new HttpError('boom');
    }),
  };
});

const post = vi.mocked(client['requetes-entite'][':id'].situation.$post);

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

const renderSave = () =>
  renderHook(() => useSituationSave({ requestId: 'req-1', onRefetch: vi.fn() }), { wrapper }).result;

const save = (faitFiles: File[] = []) => renderSave().current.handleSave({}, false, faitFiles);

describe('useSituationSave', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('tells the user when the attachment upload dies on the network', async () => {
    vi.mocked(uploadFile).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(save([new File(['x'], 'piece.pdf')])).rejects.toBeInstanceOf(TypeError);
    expect(notifySaveNetworkFailure).toHaveBeenCalledTimes(1);
    expect(post).not.toHaveBeenCalled();
  });

  it('tells the user when the save request itself dies on the network', async () => {
    post.mockRejectedValue(new TypeError('Failed to fetch') as never);

    await expect(save()).rejects.toBeInstanceOf(TypeError);
    expect(notifySaveNetworkFailure).toHaveBeenCalledTimes(1);
  });

  it('leaves an answered request to the HttpError branch', async () => {
    post.mockResolvedValue(new Response(null, { status: 500 }) as never);

    await expect(save()).rejects.toBeInstanceOf(HttpError);
    expect(notifySaveNetworkFailure).not.toHaveBeenCalled();
  });
});
