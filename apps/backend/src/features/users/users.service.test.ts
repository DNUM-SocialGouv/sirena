import { beforeEach, describe, expect, it, vi } from 'vitest';
import { entitesDescendantIdsCache } from '@/features/entites/entites.cache';
import { prisma } from '@/libs/prisma';
import { createChangeLog } from '../changelog/changelog.service';
import { ChangeLogAction } from '../changelog/changelog.type';
import {
  createUser,
  deleteUser,
  getUserById,
  getUserBySub,
  getUserEntities,
  getUsers,
  patchUser,
} from './users.service';

vi.mock('@/libs/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    changeLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/config/env', () => ({
  envVars: {
    SUPER_ADMIN_LIST_EMAIL: 'coucou@test.fr;user@admin.fr',
  },
}));

vi.mock('@/features/changelog/changelog.service', () => ({
  createChangeLog: vi.fn(),
}));

vi.mock('@/features/entites/entites.cache', () => ({
  entitesDescendantIdsCache: {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
    has: vi.fn(),
  },
}));

const mockedUser = vi.mocked(prisma.user);

const mockUser = {
  id: 'user1',
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  uid: 'uid1',
  sub: 'sub1',
  createdAt: new Date(),
  active: true,
  pcData: {},
  roleId: 'PENDING',
  statutId: 'NON_RENSEIGNE',
  entiteId: null,
  role: { id: 'PENDING', label: 'Pending' },
};

describe('user.service.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUsers()', () => {
    it('should call findMany with correct filters', async () => {
      mockedUser.findMany.mockResolvedValueOnce([mockUser]);
      mockedUser.count.mockResolvedValueOnce(1);
      const result = await getUsers(null, {
        roleId: ['PENDING'],
        active: true,
      });
      expect(mockedUser.findMany).toHaveBeenCalledWith({
        where: {
          roleId: { in: ['PENDING'] },
          active: true,
        },
        skip: 0,
        orderBy: { lastName: 'asc' },
        include: { role: true },
      });
      expect(result).toEqual({ data: [mockUser], total: 1 });
    });

    it('should call findMany with correct filters when RoleId[]', async () => {
      mockedUser.findMany.mockResolvedValueOnce([mockUser]);
      mockedUser.count.mockResolvedValueOnce(1);
      const result = await getUsers(['e1'], {
        roleId: ['PENDING', 'SUPER_ADMIN'],
        active: true,
      });
      expect(mockedUser.findMany).toHaveBeenCalledWith({
        where: {
          roleId: { in: ['PENDING', 'SUPER_ADMIN'] },
          active: true,
          entiteId: { in: ['e1'] },
        },
        skip: 0,
        orderBy: { lastName: 'asc' },
        include: { role: true },
      });
      expect(result).toEqual({ data: [mockUser], total: 1 });
    });

    it('should call find many with correct entiteId', async () => {
      mockedUser.findMany.mockResolvedValueOnce([mockUser]);
      mockedUser.count.mockResolvedValueOnce(1);
      const result = await getUsers(['e1']);
      expect(mockedUser.findMany).toHaveBeenCalledWith({
        where: { entiteId: { in: ['e1'] } },
        skip: 0,
        orderBy: { lastName: 'asc' },
        include: { role: true },
      });
      expect(result).toEqual({ data: [mockUser], total: 1 });
    });

    it('should filter users by search string (firstName, lastName, email)', async () => {
      mockedUser.findMany.mockResolvedValueOnce([mockUser]);
      mockedUser.count.mockResolvedValueOnce(1);

      const result = await getUsers(null, { search: 'doe', limit: 10 });

      expect(mockedUser.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { firstName: { contains: 'doe', mode: 'insensitive' } },
            { lastName: { contains: 'doe', mode: 'insensitive' } },
            { email: { contains: 'doe', mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 10,
        orderBy: { lastName: 'asc' },
        include: { role: true },
      });

      expect(result).toEqual({ data: [mockUser], total: 1 });
    });
  });

  describe('getUserById()', () => {
    it('should call findFirst with id', async () => {
      mockedUser.findFirst.mockResolvedValueOnce(mockUser);
      const result = await getUserById('user1', null, null);
      expect(mockedUser.findFirst).toHaveBeenCalledWith({
        where: { id: 'user1' },
        include: { role: true },
      });
      expect(result).toEqual(mockUser);
    });

    it('should call findFirst with id and entitesId', async () => {
      mockedUser.findFirst.mockResolvedValueOnce(mockUser);
      const result = await getUserById('user1', ['e1'], ['PENDING']);
      expect(mockedUser.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'user1',
          roleId: { in: ['PENDING'] },
          entiteId: { in: ['e1'] },
        },
        include: { role: true },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('getUserBySub()', () => {
    it('should call findUnique with sub', async () => {
      mockedUser.findUnique.mockResolvedValueOnce(mockUser);
      const result = await getUserBySub('sub1');
      expect(mockedUser.findUnique).toHaveBeenCalledWith({
        where: { sub: 'sub1' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('createUser()', () => {
    it('should call create with default roleId and statutId', async () => {
      mockedUser.create.mockResolvedValueOnce(mockUser);
      const dto = {
        sub: 'sub1',
        uid: 'uid1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        pcData: {},
        entiteId: null,
      };
      const result = await createUser(dto);
      expect(mockedUser.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          roleId: 'PENDING',
          statutId: 'NON_RENSEIGNE',
          pcData: dto.pcData,
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should call create with SUPER_ADMIN role if email is in SUPER_ADMIN_LIST_EMAIL', async () => {
      mockedUser.create.mockResolvedValueOnce(mockUser);
      const dto = {
        sub: 'sub1',
        uid: 'uid1',
        email: 'user@admin.fr',
        firstName: 'John',
        lastName: 'Doe',
        pcData: {},
        entiteId: null,
      };
      const result = await createUser(dto);
      expect(mockedUser.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          roleId: 'SUPER_ADMIN',
          statutId: 'NON_RENSEIGNE',
          pcData: dto.pcData,
        },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('deleteUser()', () => {
    it('should call delete with id', async () => {
      mockedUser.delete.mockResolvedValueOnce(mockUser);
      const result = await deleteUser('user1');
      expect(mockedUser.delete).toHaveBeenCalledWith({
        where: { id: 'user1' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('patchUser()', () => {
    it('should call update when user is accessible', async () => {
      mockedUser.findFirst.mockResolvedValueOnce(mockUser);
      mockedUser.update = vi.fn().mockResolvedValueOnce({ ...mockUser, roleId: 'SUPER_ADMIN' });

      const result = await patchUser('user1', { roleId: 'SUPER_ADMIN' }, 'admin123');

      expect(mockedUser.findFirst).toHaveBeenCalledWith({
        where: { id: 'user1' },
        include: { role: true },
      });

      expect(mockedUser.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: { roleId: 'SUPER_ADMIN' },
      });

      expect(result).toEqual({ ...mockUser, roleId: 'SUPER_ADMIN' });
    });

    it('should return null when user is not accessible', async () => {
      mockedUser.findFirst.mockResolvedValueOnce(null);

      const result = await patchUser('user1', { roleId: 'SUPER_ADMIN' }, 'admin123');

      expect(mockedUser.findFirst).toHaveBeenCalledWith({
        where: { id: 'user1' },
        include: { role: true },
      });

      expect(result).toBeNull();
    });

    it('should call createChangeLog when user.roleId is updated', async () => {
      mockedUser.findFirst.mockResolvedValueOnce(mockUser);
      mockedUser.update = vi.fn().mockResolvedValueOnce({ ...mockUser, roleId: 'SUPER_ADMIN' });

      await patchUser('user1', { roleId: 'SUPER_ADMIN' }, 'admin123');

      expect(createChangeLog).toHaveBeenCalledTimes(1);
      expect(createChangeLog).toHaveBeenCalledWith({
        entity: 'User',
        entityId: mockUser.id,
        action: ChangeLogAction.UPDATED,
        before: {
          roleId: mockUser.roleId,
          entiteId: mockUser.entiteId,
          statutId: mockUser.statutId,
          active: mockUser.active,
        },
        after: {
          entiteId: mockUser.entiteId,
          statutId: mockUser.statutId,
          active: mockUser.active,
          roleId: 'SUPER_ADMIN',
        },
        changedById: 'admin123',
      });
    });

    it('should call createChangeLog when user.entiteId is updated', async () => {
      mockedUser.findFirst.mockResolvedValueOnce(mockUser);
      mockedUser.update = vi.fn().mockResolvedValueOnce({ ...mockUser, entiteId: 'new-entite-id' });

      await patchUser('user1', { entiteId: 'new-entite-id' }, 'admin123');

      expect(createChangeLog).toHaveBeenCalledTimes(1);
      expect(createChangeLog).toHaveBeenCalledWith({
        entity: 'User',
        entityId: mockUser.id,
        action: ChangeLogAction.UPDATED,
        before: {
          roleId: mockUser.roleId,
          entiteId: mockUser.entiteId,
          statutId: mockUser.statutId,
          active: mockUser.active,
        },
        after: {
          entiteId: 'new-entite-id',
          statutId: mockUser.statutId,
          active: mockUser.active,
          roleId: mockUser.roleId,
        },
        changedById: 'admin123',
      });
    });

    it('should call createChangeLog when user.statutId is updated', async () => {
      mockedUser.findFirst.mockResolvedValueOnce(mockUser);
      mockedUser.update = vi.fn().mockResolvedValueOnce({ ...mockUser, statutId: 'new-statut-id' });

      await patchUser('user1', { entiteId: 'new-statut-id' }, 'admin123');

      expect(createChangeLog).toHaveBeenCalledTimes(1);
      expect(createChangeLog).toHaveBeenCalledWith({
        entity: 'User',
        entityId: mockUser.id,
        action: ChangeLogAction.UPDATED,
        before: {
          roleId: mockUser.roleId,
          entiteId: mockUser.entiteId,
          statutId: mockUser.statutId,
          active: mockUser.active,
        },
        after: {
          entiteId: mockUser.entiteId,
          statutId: 'new-statut-id',
          active: mockUser.active,
          roleId: mockUser.roleId,
        },
        changedById: 'admin123',
      });
    });

    it('should call createChangeLog when user.active is updated', async () => {
      mockedUser.findFirst.mockResolvedValueOnce(mockUser);
      mockedUser.update = vi.fn().mockResolvedValueOnce({ ...mockUser, active: false });

      await patchUser('user1', { active: false }, 'admin123');

      expect(createChangeLog).toHaveBeenCalledTimes(1);
      expect(createChangeLog).toHaveBeenCalledWith({
        entity: 'User',
        entityId: mockUser.id,
        action: ChangeLogAction.UPDATED,
        before: {
          roleId: mockUser.roleId,
          entiteId: mockUser.entiteId,
          statutId: mockUser.statutId,
          active: mockUser.active,
        },
        after: {
          entiteId: mockUser.entiteId,
          statutId: mockUser.statutId,
          active: false,
          roleId: mockUser.roleId,
        },
        changedById: 'admin123',
      });
    });

    it('should not call createChangeLog when an untracked field is updated', async () => {
      mockedUser.findFirst.mockResolvedValueOnce(mockUser);
      mockedUser.update = vi.fn().mockResolvedValueOnce({ ...mockUser, email: 'new-email@example.com' });

      await patchUser('user1', { email: 'new-email@example.com' }, 'admin123');

      expect(createChangeLog).not.toHaveBeenCalled();
    });

    it('should not call createChangeLog when a tracked field is updated and no changedById is provided', async () => {
      mockedUser.findFirst.mockResolvedValueOnce(mockUser);
      mockedUser.update = vi.fn().mockResolvedValueOnce({ ...mockUser, active: false });

      await patchUser('user1', { active: false });

      expect(createChangeLog).not.toHaveBeenCalled();
    });
  });

  describe('getUserEntities()', () => {
    it('should return descendant entites when entiteId exists', async () => {
      const mockEntiteList = ['e1'];

      mockedUser.findFirst.mockResolvedValueOnce({
        ...mockUser,
        entiteId: 'entite-root',
        roleId: 'PENDING',
      });
      vi.mocked(entitesDescendantIdsCache.get).mockResolvedValueOnce(mockEntiteList);

      const result = await getUserEntities('user1', null);

      expect(mockedUser.findFirst).toHaveBeenCalledWith({
        where: { id: 'user1' },
        include: { role: true },
      });

      expect(entitesDescendantIdsCache.get).toHaveBeenCalledWith('entite-root');
      expect(result).toEqual(mockEntiteList);
    });

    it('should return null if user is SUPER_ADMIN', async () => {
      mockedUser.findFirst.mockResolvedValueOnce({
        ...mockUser,
        entiteId: 'entite-root',
        roleId: 'SUPER_ADMIN',
      });

      const result = await getUserEntities('user1', null);

      expect(result).toBeNull();
      expect(entitesDescendantIdsCache.get).not.toHaveBeenCalled();
    });

    it('should return empty array if user has no entiteId and is not SUPER_ADMIN', async () => {
      mockedUser.findFirst.mockResolvedValueOnce({
        ...mockUser,
        entiteId: null,
        roleId: 'PENDING',
      });

      const result = await getUserEntities('user1', null);

      expect(result).toEqual([]);
    });

    it('should return empty array if user does not exist', async () => {
      mockedUser.findFirst.mockResolvedValueOnce(null);

      const result = await getUserEntities('user1', null);

      expect(result).toEqual([]);
    });
  });
});
