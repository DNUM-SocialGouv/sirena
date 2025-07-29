import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetTrackingHeaders = vi.fn(() => ({
  'x-request-id': 'mock-request-id',
  'x-trace-id': 'mock-trace-id',
  'x-session-id': 'mock-session-id',
}));

vi.mock('@/lib/tracking', () => ({
  getTrackingHeaders: mockGetTrackingHeaders,
}));

const mockHcWithType = vi.fn(() => ({
  profile: { $get: vi.fn() },
}));
vi.mock('@sirena/backend/hc', () => ({
  hcWithType: mockHcWithType,
}));

describe('API client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should configure hcWithType with tracking headers', async () => {
    await import('./hc');

    expect(mockHcWithType).toHaveBeenCalledWith('/api', {
      headers: mockGetTrackingHeaders,
    });
  });

  it('should configure client with headers function', async () => {
    await import('./hc');

    expect(mockHcWithType).toHaveBeenCalledWith(
      '/api',
      expect.objectContaining({
        headers: mockGetTrackingHeaders,
      }),
    );
  });

  it('should use the correct API base path', async () => {
    await import('./hc');

    expect(mockHcWithType).toHaveBeenCalledWith(
      '/api',
      expect.objectContaining({
        headers: expect.any(Function) as () => Record<string, string>,
      }),
    );
  });
});
