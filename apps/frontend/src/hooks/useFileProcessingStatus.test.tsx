import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type FileProcessingStatus, getFileProcessingStatus } from '@/lib/api/fetchUploadedFiles';
import { HttpError } from '@/lib/api/tanstackQuery';
import { useFileProcessingStatus } from './useFileProcessingStatus';

const getFileProcessingStatusMock = vi.hoisted(() => vi.fn());

const sse = vi.hoisted(() => ({
  isConnected: false,
  options: null as {
    fileId: string;
    enabled?: boolean;
    onStatusChange?: (status: FileProcessingStatus) => void;
  } | null,
}));

vi.mock('./useFileStatusSSE', () => ({
  useFileStatusSSE: (options: NonNullable<typeof sse.options>) => {
    sse.options = options;
    return { isConnected: sse.isConnected };
  },
}));

vi.mock('@/lib/api/fetchUploadedFiles', () => ({
  getFileProcessingStatus: getFileProcessingStatusMock,
}));

const status = (scanStatus = 'PENDING', sanitizeStatus = 'PENDING'): FileProcessingStatus => ({
  id: 'file-1',
  status: 'PROCESSING',
  scanStatus,
  sanitizeStatus,
  processingError: null,
  safeFilePath: null,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-14T12:00:00.000Z'));
  sse.isConnected = false;
  sse.options = null;
  vi.mocked(getFileProcessingStatus).mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useFileProcessingStatus', () => {
  it.each([
    { name: 'immediately without an initial status', initialStatus: null, callsAtStart: 1, callsAfterInterval: 2 },
    {
      name: 'after one interval with an initial status',
      initialStatus: status(),
      callsAtStart: 0,
      callsAfterInterval: 1,
    },
  ])('polls $name', async ({ initialStatus, callsAtStart, callsAfterInterval }) => {
    const polledStatus = status('CLEAN', 'COMPLETED');
    vi.mocked(getFileProcessingStatus).mockResolvedValue(polledStatus);

    const { result } = renderHook(() => useFileProcessingStatus({ fileId: 'file-1', initialStatus }));

    expect(result.current).toEqual(initialStatus);
    expect(sse.options?.enabled).toBe(true);
    expect(getFileProcessingStatus).toHaveBeenCalledTimes(callsAtStart);

    await act(() => vi.advanceTimersByTimeAsync(3000));

    expect(getFileProcessingStatus).toHaveBeenCalledTimes(callsAfterInterval);
    expect(result.current).toEqual(polledStatus);
  });

  it('only performs the no-status immediate poll once across SSE reconnections', async () => {
    vi.mocked(getFileProcessingStatus).mockResolvedValue(status());

    const { rerender } = renderHook(() => useFileProcessingStatus({ fileId: 'file-1', initialStatus: null }));
    expect(getFileProcessingStatus).toHaveBeenCalledOnce();

    sse.isConnected = true;
    rerender();
    await act(() => vi.advanceTimersByTimeAsync(6000));
    expect(getFileProcessingStatus).toHaveBeenCalledOnce();

    sse.isConnected = false;
    rerender();
    expect(getFileProcessingStatus).toHaveBeenCalledOnce();

    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(getFileProcessingStatus).toHaveBeenCalledTimes(2);
  });

  it('uses SSE while connected, falls back to polling after disconnection, and stops at a terminal status', async () => {
    const initialStatus = status();
    const sseStatus = status('CLEAN', 'PENDING');
    const terminalStatus = status('CLEAN', 'COMPLETED');
    vi.mocked(getFileProcessingStatus).mockResolvedValue(sseStatus);
    sse.isConnected = true;

    const { result, rerender } = renderHook(() => useFileProcessingStatus({ fileId: 'file-1', initialStatus }));

    await act(() => vi.advanceTimersByTimeAsync(6000));
    expect(getFileProcessingStatus).not.toHaveBeenCalled();

    act(() => sse.options?.onStatusChange?.(sseStatus));
    expect(result.current).toEqual(sseStatus);

    sse.isConnected = false;
    rerender();
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(getFileProcessingStatus).toHaveBeenCalledOnce();

    act(() => sse.options?.onStatusChange?.(terminalStatus));
    expect(result.current).toEqual(terminalStatus);
    expect(sse.options?.enabled).toBe(false);

    await act(() => vi.advanceTimersByTimeAsync(6000));
    expect(getFileProcessingStatus).toHaveBeenCalledOnce();
  });

  it.each([
    { name: 'retries another error', error: new Error('network unavailable'), callsAfterRetry: 2 },
    { name: 'stops after a 404', error: new HttpError('file not found', 404), callsAfterRetry: 1 },
  ])('$name', async ({ error, callsAfterRetry }) => {
    const initialStatus = status();
    const recoveredStatus = status('CLEAN', 'COMPLETED');
    vi.mocked(getFileProcessingStatus).mockRejectedValueOnce(error).mockResolvedValue(recoveredStatus);

    const { result } = renderHook(() => useFileProcessingStatus({ fileId: 'file-1', initialStatus }));

    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(result.current).toEqual(initialStatus);

    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(getFileProcessingStatus).toHaveBeenCalledTimes(callsAfterRetry);
    expect(result.current).toEqual(callsAfterRetry === 2 ? recoveredStatus : initialStatus);
  });

  it('stops polling after two minutes', async () => {
    vi.mocked(getFileProcessingStatus).mockResolvedValue(status());
    renderHook(() => useFileProcessingStatus({ fileId: 'file-1', initialStatus: status() }));

    await act(() => vi.advanceTimersByTimeAsync(2 * 60 * 1000));
    expect(getFileProcessingStatus).toHaveBeenCalledTimes(40);

    await act(() => vi.advanceTimersByTimeAsync(60 * 1000));
    expect(getFileProcessingStatus).toHaveBeenCalledTimes(40);
  });
});
