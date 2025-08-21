import { STATUT_TYPES } from '@sirena/common/constants';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppBindings } from '@/helpers/factories/appWithAuth';
import type { createMockPinoLogger } from '@/tests/test-utils';
import userStatusMiddleware from './userStatus.middleware';

interface UserStatusMockContextOverrides {
  res?: Record<string, unknown>;
  logger?: ReturnType<typeof createMockPinoLogger>;
  get?: (key: string) => unknown;
  json?: ReturnType<typeof vi.fn>;
}

const createUserStatusMockContext = (overrides: UserStatusMockContextOverrides = {}) => {
  return {
    req: {},
    res: { headers: { set: vi.fn() } },
    set: vi.fn(),
    get: vi.fn().mockImplementation((key: string) => {
      return overrides.get?.(key);
    }),
    json: vi.fn(),
    ...overrides,
  };
};

const { mockThrowHTTPException403Forbidden, mockGetUserById } = vi.hoisted(() => {
  const mockThrowHTTPException403Forbidden = vi.fn();
  const mockGetUserById = vi.fn();

  return { mockThrowHTTPException403Forbidden, mockGetUserById };
});

vi.mock('@sirena/backend-utils/helpers', () => ({
  throwHTTPException403Forbidden: mockThrowHTTPException403Forbidden,
}));

vi.mock('@/features/users/users.service', () => ({
  getUserById: mockGetUserById,
}));

describe('userStatus.middleware.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('userStatusMiddleware', () => {
    it('should be defined', () => {
      expect(userStatusMiddleware).toBeDefined();
    });

    it('should allow active user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        statutId: STATUT_TYPES.ACTIF,
        roleId: 'ROLE_USER',
      };

      mockGetUserById.mockResolvedValue(mockUser);

      const mockContext = createUserStatusMockContext({
        get: vi.fn().mockImplementation((key: string) => (key === 'userId' ? 'user-123' : undefined)),
      });

      const next = vi.fn();

      await userStatusMiddleware(mockContext as unknown as Context<AppBindings>, next);

      expect(mockGetUserById).toHaveBeenCalledWith('user-123', null, null);
      expect(next).toHaveBeenCalled();
      expect(mockThrowHTTPException403Forbidden).not.toHaveBeenCalled();
    });

    it('should block inactive user and throw 403 error', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'inactive@example.com',
        statutId: STATUT_TYPES.INACTIF,
        roleId: 'ROLE_USER',
      };

      mockGetUserById.mockResolvedValue(mockUser);
      mockThrowHTTPException403Forbidden.mockImplementation(() => {
        throw new HTTPException(403, { message: 'Account inactive' });
      });

      const mockContext = createUserStatusMockContext({
        get: vi.fn().mockImplementation((key: string) => (key === 'userId' ? 'user-123' : undefined)),
      });

      const next = vi.fn();

      await expect(userStatusMiddleware(mockContext as unknown as Context<AppBindings>, next)).rejects.toThrow(
        'Account inactive',
      );

      expect(mockGetUserById).toHaveBeenCalledWith('user-123', null, null);
      expect(mockThrowHTTPException403Forbidden).toHaveBeenCalledWith('Account inactive', {
        res: mockContext.res,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should block inactive user and throw 403 error', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'inactive@example.com',
        statutId: STATUT_TYPES.NON_RENSEIGNE,
        roleId: 'ROLE_USER',
      };

      mockGetUserById.mockResolvedValue(mockUser);
      mockThrowHTTPException403Forbidden.mockImplementation(() => {
        throw new HTTPException(403, { message: 'Account inactive' });
      });

      const mockContext = createUserStatusMockContext({
        get: vi.fn().mockImplementation((key: string) => (key === 'userId' ? 'user-123' : undefined)),
      });

      const next = vi.fn();

      await expect(userStatusMiddleware(mockContext as unknown as Context<AppBindings>, next)).rejects.toThrow(
        'Account inactive',
      );

      expect(mockGetUserById).toHaveBeenCalledWith('user-123', null, null);
      expect(mockThrowHTTPException403Forbidden).toHaveBeenCalledWith('Account inactive', {
        res: mockContext.res,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should throw 403 error when userId is not found in context', async () => {
      mockThrowHTTPException403Forbidden.mockImplementation(() => {
        throw new HTTPException(403, { message: 'Authentication required' });
      });

      const mockContext = createUserStatusMockContext({
        get: vi.fn().mockImplementation(() => undefined),
      });

      const next = vi.fn();

      await expect(userStatusMiddleware(mockContext as unknown as Context<AppBindings>, next)).rejects.toThrow(
        'Authentication required',
      );

      expect(mockGetUserById).not.toHaveBeenCalled();
      expect(mockThrowHTTPException403Forbidden).toHaveBeenCalledWith('Authentication required', {
        res: mockContext.res,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should throw 403 error when user is not found in database', async () => {
      mockGetUserById.mockResolvedValue(null);
      mockThrowHTTPException403Forbidden.mockImplementation(() => {
        throw new HTTPException(403, { message: 'User not found' });
      });

      const mockContext = createUserStatusMockContext({
        get: vi.fn().mockImplementation((key: string) => (key === 'userId' ? 'user-123' : undefined)),
      });

      const next = vi.fn();

      await expect(userStatusMiddleware(mockContext as unknown as Context<AppBindings>, next)).rejects.toThrow(
        'User not found',
      );

      expect(mockGetUserById).toHaveBeenCalledWith('user-123', null, null);
      expect(mockThrowHTTPException403Forbidden).toHaveBeenCalledWith('User not found', {
        res: mockContext.res,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle getUserById throwing an error', async () => {
      const dbError = new Error('Database connection failed');
      mockGetUserById.mockRejectedValue(dbError);

      const mockContext = createUserStatusMockContext({
        get: vi.fn().mockImplementation((key: string) => (key === 'userId' ? 'user-123' : undefined)),
      });

      const next = vi.fn();

      await expect(userStatusMiddleware(mockContext as unknown as Context<AppBindings>, next)).rejects.toThrow(
        dbError.message,
      );

      expect(mockGetUserById).toHaveBeenCalledWith('user-123', null, null);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
