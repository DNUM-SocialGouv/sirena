import { type Prisma, type User, prisma } from '@/libs/prisma';
import type { CreateUserDto } from '@/types/user.d';

interface GetUsersFilters {
  roleId?: string | string[];
  active?: boolean;
}

export const getUsers = async (filters?: GetUsersFilters) => {
  const where: Prisma.UserWhereInput = {};

  if (filters?.roleId) {
    where.roleId = Array.isArray(filters.roleId) ? { in: filters.roleId } : filters.roleId;
  }

  if (filters?.active !== undefined) {
    where.active = filters.active;
  }

  return prisma.user.findMany({ where, include: { role: true } });
};

export const getUserById = async (id: User['id']) =>
  await prisma.user.findUnique({ where: { id }, include: { role: true } });
export const getUserBySub = async (sub: User['sub']) => await prisma.user.findUnique({ where: { sub } });

export const createUser = async (newUser: CreateUserDto) => {
  const defaultRole = await prisma.roleEnum.findUnique({ where: { roleName: 'PENDING' }, select: { id: true } });
  const roleId = defaultRole?.id;
  return prisma.user.create({
    data: {
      ...newUser,
      roleId,
      pcData: newUser.pcData as Prisma.JsonObject,
    },
  });
};
export const deleteUser = async (id: User['id']) => await prisma.user.delete({ where: { id } });
