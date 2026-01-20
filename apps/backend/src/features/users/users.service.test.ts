import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../libs/prisma.js';
import { entitesDescendantIdsCache } from '../entites/entites.cache.js';
import {
  createUser,
  deleteUser,
  getUserByEmail,
  getUserById,
  getUserEntities,
  getUsers,
  patchUser,
} from './users.service';

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('../../config/env.js', () => ({
  envVars: {
    SUPER_ADMIN_LIST_EMAIL: 'coucou@test.fr;user@admin.fr',
  },
}));

vi.mock('@/features/entites/entites.cache', () => ({
  entitesDescendantIdsCache: {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
    has: vi.fn(),
  },
}));

vi.mock('@/helpers/sse', () => ({
  sseEventManager: {
    emitUserStatus: vi.fn(),
    emitUserList: vi.fn(),
  },
}));

const mockedUser = vi.mocked(prisma.user);

const mockUser = {
  id: 'user1',
  email: 'john@example.com',
  prenom: 'John',
  nom: 'Doe',
  uid: 'uid1',
  sub: 'sub1',
  createdAt: new Date(),
  updatedAt: new Date(),
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
      const result = await getUsers(null, { roleId: ['PENDING'], statutId: ['ACTIF'] });
      expect(mockedUser.findMany).toHaveBeenCalledWith({
        where: {
          roleId: { in: ['PENDING'] },
          statutId: { in: ['ACTIF'] },
        },
        skip: 0,
        orderBy: { nom: 'asc' },
        include: { role: true },
      });
      expect(result).toEqual({ data: [mockUser], total: 1 });
    });

    it('should call findMany with correct filters when RoleId[]', async () => {
      mockedUser.findMany.mockResolvedValueOnce([mockUser]);
      mockedUser.count.mockResolvedValueOnce(1);
      const result = await getUsers(['e1'], { roleId: ['PENDING', 'SUPER_ADMIN'], statutId: ['ACTIF'] });
      expect(mockedUser.findMany).toHaveBeenCalledWith({
        where: { roleId: { in: ['PENDING', 'SUPER_ADMIN'] }, statutId: { in: ['ACTIF'] }, entiteId: { in: ['e1'] } },
        skip: 0,
        orderBy: { nom: 'asc' },
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
        orderBy: { nom: 'asc' },
        include: { role: true },
      });
      expect(result).toEqual({ data: [mockUser], total: 1 });
    });

    it('should filter users by search string (prenom, nom, email)', async () => {
      mockedUser.findMany.mockResolvedValueOnce([mockUser]);
      mockedUser.count.mockResolvedValueOnce(1);

      const result = await getUsers(null, { search: 'doe', limit: 10 });

      expect(mockedUser.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { prenom: { contains: 'doe', mode: 'insensitive' } },
            { nom: { contains: 'doe', mode: 'insensitive' } },
            { email: { contains: 'doe', mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 10,
        orderBy: { nom: 'asc' },
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
        where: { id: 'user1', roleId: { in: ['PENDING'] }, entiteId: { in: ['e1'] } },
        include: { role: true },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('getUserByEmail()', () => {
    it('should call findFirst with email', async () => {
      mockedUser.findFirst.mockResolvedValueOnce(mockUser);
      const result = await getUserByEmail('sub@email.fr');
      expect(mockedUser.findFirst).toHaveBeenCalledWith({ where: { email: 'sub@email.fr' } });
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
        prenom: 'John',
        nom: 'Doe',
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
        prenom: 'John',
        nom: 'Doe',
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
      expect(mockedUser.delete).toHaveBeenCalledWith({ where: { id: 'user1' } });
      expect(result).toEqual(mockUser);
    });
  });

  describe('patchUser()', () => {
    it('should call update when user is accessible', async () => {
      mockedUser.update = vi.fn().mockResolvedValueOnce({ ...mockUser, roleId: 'SUPER_ADMIN' });

      const result = await patchUser('user1', { roleId: 'SUPER_ADMIN' });

      expect(mockedUser.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: { roleId: 'SUPER_ADMIN' },
      });

      expect(result).toEqual({ ...mockUser, roleId: 'SUPER_ADMIN' });
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
