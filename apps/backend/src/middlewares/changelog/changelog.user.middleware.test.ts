import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChangeLog } from '@/features/changelog/changelog.service';
import { ChangeLogAction } from '@/features/changelog/changelog.type';
import { getUserById } from '@/features/users/users.service';
import type { Prisma } from '@/libs/prisma';
import { createTestApp } from '@/tests/test-utils';
import { userChangelogMiddleware } from './changelog.user.middleware';

vi.mock('@/features/changelog/changelog.service', () => ({
  createChangeLog: vi.fn(),
}));

vi.mock('@/features/users/users.service', () => ({
  getUserById: vi.fn(),
}));

describe('changelog.user.middleware.ts', () => {
  const mockCreateChangeLog = vi.mocked(createChangeLog);
  const mockGetUserById = vi.mocked(getUserById);

  const testUser: Prisma.UserGetPayload<{ include: { role: true } }> = {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'test@example.com',
    uid: 'uid-123',
    sub: 'sub-123',
    roleId: 'role1',
    entiteId: 'entite1',
    statutId: 'statut1',
    active: true,
    createdAt: new Date(),
    pcData: {},
    role: { id: 'role1', label: 'Test Role' },
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  const createUserTestApp = () => {
    return createTestApp([
      async (c, next) => {
        c.set('userId', 'admin-user-id');
        await next();
      },
    ]).put('/users/:id', userChangelogMiddleware, async (c) => {
      return c.json({ success: true });
    });
  };

  describe('userChangelogMiddleware', () => {
    it('should track changes to user fields', async () => {
      const updatedUser = { ...testUser, roleId: 'role2', active: false, role: { id: 'role2', label: 'Updated Role' } };
      mockGetUserById.mockResolvedValueOnce(testUser).mockResolvedValueOnce(updatedUser);

      const app = createUserTestApp();

      const response = await app.request('/users/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: 'role2', active: false }),
      });

      expect(response.status).toBe(200);
      expect(mockGetUserById).toHaveBeenCalledWith('1', null, null);
      expect(mockCreateChangeLog).toHaveBeenCalledWith({
        action: ChangeLogAction.UPDATED,
        entity: 'User',
        entityId: '1',
        changedById: 'admin-user-id',
        before: {
          roleId: testUser.roleId,
          entiteId: testUser.entiteId,
          statutId: testUser.statutId,
          active: testUser.active,
        },
        after: {
          roleId: updatedUser.roleId,
          entiteId: updatedUser.entiteId,
          statutId: updatedUser.statutId,
          active: updatedUser.active,
        },
      });
    });
  });
});
