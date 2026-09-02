import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { client } from '@/lib/api/hc';
import { HttpError } from '@/lib/api/tanstackQuery';
import { useDeclarantSave } from './useDeclarantSave';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/lib/api/hc', () => ({
  client: { 'requetes-entite': { ':id': { declarant: { $patch: vi.fn() } } } },
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

const patch = vi.mocked(client['requetes-entite'][':id'].declarant.$patch);

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

const renderSave = () =>
  renderHook(() => useDeclarantSave({ requestId: 'req-1', onRefetch: vi.fn() }), { wrapper }).result;

describe('useDeclarantSave', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves on a 409 conflict instead of rejecting into an unhandled rejection', async () => {
    patch.mockResolvedValue(
      new Response(JSON.stringify({ conflictData: {}, message: 'The requete has been modified by another user.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }) as never,
    );

    const { handleSave } = renderSave().current;

    await expect(handleSave({ prenom: 'Ada' })).resolves.toBeUndefined();
  });

  it('still rejects on a non-conflict failure', async () => {
    patch.mockResolvedValue(new Response(null, { status: 500 }) as never);

    const { handleSave } = renderSave().current;

    await expect(handleSave({ prenom: 'Ada' })).rejects.toBeInstanceOf(HttpError);
  });
});
