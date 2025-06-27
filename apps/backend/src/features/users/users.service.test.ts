import { prisma } from '@/libs/prisma';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createUser, deleteUser, getUserById, getUserBySub, getUsers } from './users.service';

vi.mock('@/libs/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
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

  it('getUsers - should call findMany with correct filters', async () => {
    mockedUser.findMany.mockResolvedValue([mockUser]);
    const result = await getUsers({ roleId: 'PENDING', active: true });
    expect(mockedUser.findMany).toHaveBeenCalledWith({
      where: { roleId: 'PENDING', active: true },
      include: { role: true },
    });
    expect(result).toEqual([mockUser]);
  });

  it('getUserById - should call findUnique with id', async () => {
    mockedUser.findUnique.mockResolvedValue(mockUser);
    const result = await getUserById('user1');
    expect(mockedUser.findUnique).toHaveBeenCalledWith({
      where: { id: 'user1' },
      include: { role: true },
    });
    expect(result).toEqual(mockUser);
  });

  it('getUserBySub - should call findUnique with sub', async () => {
    mockedUser.findUnique.mockResolvedValue(mockUser);
    const result = await getUserBySub('sub1');
    expect(mockedUser.findUnique).toHaveBeenCalledWith({ where: { sub: 'sub1' } });
    expect(result).toEqual(mockUser);
  });

  it('createUser - should call create with default roleId and statutId', async () => {
    mockedUser.create.mockResolvedValue(mockUser);
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

  it('deleteUser - should call delete with id', async () => {
    mockedUser.delete.mockResolvedValue(mockUser);
    const result = await deleteUser('user1');
    expect(mockedUser.delete).toHaveBeenCalledWith({ where: { id: 'user1' } });
    expect(result).toEqual(mockUser);
  });
});
