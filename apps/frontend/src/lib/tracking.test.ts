import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTrackingContext, generateUUID, getSessionId, getTrackingHeaders } from './tracking';

type UUIDString = `${string}-${string}-${string}-${string}-${string}`;
const mockUUID = 'mock-uuid-123';
const mockCrypto = {
  randomUUID: vi.fn(() => mockUUID),
};
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  configurable: true,
});

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('tracking utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  describe('generateUUID', () => {
    it('should generate a UUID using crypto.randomUUID when available', () => {
      const uuid = generateUUID();

      expect(uuid).toBe(mockUUID);
      expect(crypto.randomUUID).toHaveBeenCalledOnce();
    });

    it('should fallback to Math.random when crypto.randomUUID is not available', () => {
      // Temporarily remove crypto.randomUUID
      const originalCrypto = global.crypto;
      Object.defineProperty(global, 'crypto', {
        value: {},
        configurable: true,
      });

      const uuid = generateUUID();

      // Should be a valid UUID v4 format
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

      // Restore crypto
      Object.defineProperty(global, 'crypto', {
        value: originalCrypto,
        configurable: true,
      });
    });

    it('should fallback when crypto is undefined', () => {
      // Temporarily remove crypto entirely
      const originalCrypto = global.crypto;
      Reflect.deleteProperty(global as typeof global & { crypto?: Crypto }, 'crypto');

      const uuid = generateUUID();

      // Should be a valid UUID v4 format
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

      // Restore crypto
      (global as typeof global & { crypto?: Crypto }).crypto = originalCrypto;
    });

    it('should generate unique UUIDs with fallback method', () => {
      // Remove crypto.randomUUID to force fallback
      const originalCrypto = global.crypto;
      Object.defineProperty(global, 'crypto', {
        value: {},
        configurable: true,
      });

      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      const uuid3 = generateUUID();

      // Should all be different
      expect(uuid1).not.toBe(uuid2);
      expect(uuid2).not.toBe(uuid3);
      expect(uuid1).not.toBe(uuid3);

      // Should all be valid UUID v4 format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(uuid1).toMatch(uuidRegex);
      expect(uuid2).toMatch(uuidRegex);
      expect(uuid3).toMatch(uuidRegex);

      // Restore crypto
      Object.defineProperty(global, 'crypto', {
        value: originalCrypto,
        configurable: true,
      });
    });
  });

  describe('getSessionId', () => {
    it('should return existing sessionId from sessionStorage', () => {
      const existingSessionId = 'existing-session-id';
      mockSessionStorage.getItem.mockReturnValue(existingSessionId);

      const sessionId = getSessionId();

      expect(sessionId).toBe(existingSessionId);
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith('sessionId');
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });

    it('should generate and store new sessionId when none exists', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const sessionId = getSessionId();

      expect(sessionId).toBe(mockUUID);
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith('sessionId');
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('sessionId', mockUUID);
    });

    it('should return the same sessionId on subsequent calls', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      // First call - should generate and store
      const firstCall = getSessionId();
      expect(firstCall).toBe(mockUUID);
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('sessionId', mockUUID);

      // Mock that sessionStorage now has the value
      mockSessionStorage.getItem.mockReturnValue(mockUUID);
      vi.clearAllMocks();

      // Second call - should retrieve from storage
      const secondCall = getSessionId();
      expect(secondCall).toBe(mockUUID);
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith('sessionId');
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('createTrackingContext', () => {
    it('should create a tracking context with all required fields', () => {
      const existingSessionId = 'existing-session-id';
      mockSessionStorage.getItem.mockReturnValue(existingSessionId);

      const context = createTrackingContext();

      expect(context).toEqual({
        requestId: mockUUID,
        traceId: mockUUID,
        sessionId: existingSessionId,
      });
    });

    it('should create unique requestId and traceId for each call', () => {
      let callCount = 0;
      const mockUUIDs = ['request-id-1', 'trace-id-1', 'request-id-2', 'trace-id-2'];
      vi.mocked(crypto.randomUUID).mockImplementation(() => mockUUIDs[callCount++] as UUIDString);

      const existingSessionId = 'existing-session-id';
      mockSessionStorage.getItem.mockReturnValue(existingSessionId);

      const context1 = createTrackingContext();
      const context2 = createTrackingContext();

      expect(context1).toEqual({
        requestId: 'request-id-1',
        traceId: 'trace-id-1',
        sessionId: existingSessionId,
      });

      expect(context2).toEqual({
        requestId: 'request-id-2',
        traceId: 'trace-id-2',
        sessionId: existingSessionId,
      });
    });
  });

  describe('getTrackingHeaders', () => {
    it('should return tracking headers in correct format', () => {
      const mockRequestId = 'request-123';
      const mockTraceId = 'trace-456';
      const mockSessionId = 'session-789';

      let callCount = 0;
      vi.mocked(crypto.randomUUID).mockImplementation(() => {
        const ids = [mockRequestId, mockTraceId];
        return ids[callCount++] as UUIDString;
      });

      mockSessionStorage.getItem.mockReturnValue(mockSessionId);

      const headers = getTrackingHeaders();

      expect(headers).toEqual({
        'x-request-id': mockRequestId,
        'x-trace-id': mockTraceId,
        'x-session-id': mockSessionId,
      });
    });

    it('should generate new requestId and traceId for each call but reuse sessionId', () => {
      const sessionId = 'persistent-session-id';
      mockSessionStorage.getItem.mockReturnValue(sessionId);

      let callCount = 0;
      const mockUUIDs = ['req-1', 'trace-1', 'req-2', 'trace-2'];
      vi.mocked(crypto.randomUUID).mockImplementation(() => mockUUIDs[callCount++] as UUIDString);

      const headers1 = getTrackingHeaders();
      const headers2 = getTrackingHeaders();

      expect(headers1).toEqual({
        'x-request-id': 'req-1',
        'x-trace-id': 'trace-1',
        'x-session-id': sessionId,
      });

      expect(headers2).toEqual({
        'x-request-id': 'req-2',
        'x-trace-id': 'trace-2',
        'x-session-id': sessionId,
      });
    });
  });
});
