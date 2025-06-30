import { ROLES } from '@sirena/common/constants';
import { envVars } from '@/config/env';
import { type Prisma, prisma, type User } from '@/libs/prisma';
import type { CreateUserDto, PatchUserDto } from './user.type';

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
  const adminEmails = envVars.SUPER_ADMIN_LIST_EMAIL.split(';');
  const roleId = adminEmails.find((adminEmail) => adminEmail === newUser.email) ? ROLES.SUPER_ADMIN : ROLES.PENDING;
  const statutId = 'NON_RENSEIGNE';
  return prisma.user.create({
    data: {
      statutId,
      ...newUser,
      roleId,
      pcData: newUser.pcData as Prisma.JsonObject,
    },
  });
};
export const deleteUser = async (id: User['id']) => await prisma.user.delete({ where: { id } });

export const patchUser = async (id: User['id'], data: PatchUserDto) => {
  return prisma.user.update({
    where: { id },
    data: {
      ...data,
    },
  });
};
