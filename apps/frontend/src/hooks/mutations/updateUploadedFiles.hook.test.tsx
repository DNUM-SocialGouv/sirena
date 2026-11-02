import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDeleteUploadedFile, useUploadFile } from './updateUploadedFiles.hook';

const uploadFile = vi.fn();
const deleteUploadedFile = vi.fn();

vi.mock('@/lib/api/fetchUploadedFiles', () => ({
  uploadFile: (...args: unknown[]) => uploadFile(...args),
  deleteUploadedFile: (...args: unknown[]) => deleteUploadedFile(...args),
}));

const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  queryClient.clear();
});

describe('useUploadFile', () => {
  it('leaves the cache alone once the file is uploaded', async () => {
    const setQueryData = vi.spyOn(queryClient, 'setQueryData');
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    uploadFile.mockResolvedValue({ id: 'file-1' });

    const { result } = renderHook(() => useUploadFile(), { wrapper });
    result.current.mutate(new File(['content'], 'report.pdf'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // `uploadFile` answers with a single file, never the list a ['uploaded-files'] query would hold.
    expect(setQueryData).not.toHaveBeenCalled();
    expect(invalidateQueries).not.toHaveBeenCalled();
    expect(queryClient.getQueryState(['uploaded-files'])).toBeUndefined();
  });
});

describe('useDeleteUploadedFile', () => {
  it('invalidates the queries that actually hold the deleted file', async () => {
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    deleteUploadedFile.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteUploadedFile({ requeteId: 'requete-1' }), { wrapper });
    result.current.mutate('file-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['processingSteps'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['requete', 'requete-1'] });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ['uploaded-files'] });
    expect(invalidateQueries).toHaveBeenCalledTimes(2);
  });

  it('skips the requete query when no requete is given', async () => {
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    deleteUploadedFile.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteUploadedFile(), { wrapper });
    result.current.mutate('file-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['processingSteps'] });
  });
});
