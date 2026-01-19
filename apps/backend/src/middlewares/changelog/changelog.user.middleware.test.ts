import { testClient } from 'hono/testing';
import type { PinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChangeLog } from '../../features/changelog/changelog.service.js';
import { ChangeLogAction } from '../../features/changelog/changelog.type.js';
import { getUserById } from '../../features/users/users.service.js';
import appWithAuth from '../../helpers/factories/appWithAuth.js';
import type { Prisma } from '../../libs/prisma.js';
import userChangelogMiddleware from './changelog.user.middleware.js';

vi.mock('../../features/changelog/changelog.service.js', () => ({
  createChangeLog: vi.fn(),
}));

vi.mock('../../features/users/users.service.js', () => ({
  getUserById: vi.fn(),
}));

describe('changelog.user.middleware.ts', () => {
  const mockCreateChangeLog = vi.mocked(createChangeLog);
  const mockGetUserById = vi.mocked(getUserById);

  const testUser: Prisma.UserGetPayload<{ include: { role: true } }> = {
    id: '1',
    prenom: 'John',
    nom: 'Doe',
    email: 'test@example.com',
    uid: 'uid-123',
    sub: 'sub-123',
    roleId: 'role1',
    entiteId: 'entite1',
    statutId: 'statut1',
    createdAt: new Date(),
    updatedAt: new Date(),
    pcData: {},
    role: { id: 'role1', label: 'Test Role' },
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  const createUserTestApp = () => {
    const app = appWithAuth
      .createApp()
      .use((c, next) => {
        const logger = {
          warn: vi.fn(),
        };
        c.set('logger', logger as unknown as PinoLogger);
        return next();
      })
      .use((c, next) => {
        c.set('userId', 'admin-user-id');
        return next();
      })
      .patch('/:id', userChangelogMiddleware({ action: ChangeLogAction.UPDATED }), async (c) => {
        return c.json({ ok: true });
      });

    return testClient(app);
  };

  describe('userChangelogMiddleware', () => {
    it('should track changes to user fields', async () => {
      const updatedUser = {
        ...testUser,
        roleId: 'role2',
        statutId: 'statut2',
        role: { id: 'role2', label: 'Updated Role' },
      };
      mockGetUserById.mockResolvedValueOnce(testUser).mockResolvedValueOnce(updatedUser);

      const app = createUserTestApp();

      const response = await app[':id'].$patch({ param: { id: '1' } });

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
        },
        after: {
          roleId: updatedUser.roleId,
          entiteId: updatedUser.entiteId,
          statutId: updatedUser.statutId,
        },
      });
    });
  });
});
