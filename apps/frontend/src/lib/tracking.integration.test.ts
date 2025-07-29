import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUUIDs = ['uuid-1', 'uuid-2', 'uuid-3', 'uuid-4'];
let uuidCallCount = 0;

Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => mockUUIDs[uuidCallCount++]),
  },
});

const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('Tracking Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uuidCallCount = 0;
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  describe('session persistence', () => {
    it('should generate and persist sessionId across multiple calls', async () => {
      const { getSessionId } = await import('./tracking');

      const firstSessionId = getSessionId();
      expect(firstSessionId).toBe('uuid-1');
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('sessionId', 'uuid-1');

      mockSessionStorage.getItem.mockReturnValue('uuid-1');
      vi.clearAllMocks();

      const secondSessionId = getSessionId();
      expect(secondSessionId).toBe('uuid-1');
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith('sessionId');
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });

    it('should generate unique request and trace IDs but reuse session ID', async () => {
      mockSessionStorage.getItem.mockReturnValue('existing-session');

      const { getTrackingHeaders } = await import('./tracking');

      const headers1 = getTrackingHeaders();
      const headers2 = getTrackingHeaders();

      expect(headers1).toEqual({
        'x-request-id': 'uuid-1',
        'x-trace-id': 'uuid-2',
        'x-session-id': 'existing-session',
      });

      expect(headers2).toEqual({
        'x-request-id': 'uuid-3',
        'x-trace-id': 'uuid-4',
        'x-session-id': 'existing-session',
      });
    });
  });

  describe('header generation', () => {
    it('should generate proper tracking headers format', async () => {
      mockSessionStorage.getItem.mockReturnValue('test-session');

      const { getTrackingHeaders } = await import('./tracking');
      const headers = getTrackingHeaders();

      expect(headers).toHaveProperty('x-request-id');
      expect(headers).toHaveProperty('x-trace-id');
      expect(headers).toHaveProperty('x-session-id');

      expect(typeof headers['x-request-id']).toBe('string');
      expect(typeof headers['x-trace-id']).toBe('string');
      expect(typeof headers['x-session-id']).toBe('string');

      expect(headers['x-request-id']).toBe('uuid-1');
      expect(headers['x-trace-id']).toBe('uuid-2');
      expect(headers['x-session-id']).toBe('test-session');
    });

    it('should call crypto.randomUUID for each new ID generation', async () => {
      const { generateUUID, createTrackingContext } = await import('./tracking');

      generateUUID();
      generateUUID();
      createTrackingContext();

      expect(crypto.randomUUID).toHaveBeenCalledTimes(5);
    });
  });

  describe('API client integration', () => {
    it('should integrate with API client configuration', async () => {
      const mockHcWithType = vi.fn(() => ({ profile: { $get: vi.fn() } }));
      vi.doMock('@sirena/backend/hc', () => ({ hcWithType: mockHcWithType }));

      mockSessionStorage.getItem.mockReturnValue('api-session');

      await import('./api/hc');

      expect(mockHcWithType).toHaveBeenCalledWith('/api', {
        headers: expect.any(Function) as () => Record<string, string>,
      });

      const config = mockHcWithType.mock.calls[0][1];
      const headers = config.headers();

      expect(headers).toEqual({
        'x-request-id': 'uuid-1',
        'x-trace-id': 'uuid-2',
        'x-session-id': 'api-session',
      });
    });
  });
});
