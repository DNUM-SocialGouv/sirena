import { ROLES, STATUT_TYPES } from '@sirena/common/constants';
import { envVars } from '@/config/env';
import { entitesDescendantIdsCache } from '@/features/entites/entites.cache';
import { type Prisma, prisma, type User } from '@/libs/prisma';
import type { CreateUserDto, GetUsersQuery, PatchUserDto } from './users.type';

const filterByEntities = (entiteIds: string[] | null) => {
  if (!entiteIds) {
    return null;
  }
  return { entiteId: { in: entiteIds } };
};

export const getUsers = async (entiteIds: string[] | null, query: GetUsersQuery = {}) => {
  const { offset = 0, limit, sort = 'lastName', order = 'asc', roleId, active, search } = query;

  const entiteFilter = filterByEntities(entiteIds);

  const searchConditions: Prisma.UserWhereInput[] | undefined = search?.trim()
    ? [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    : undefined;

  const where: Prisma.UserWhereInput = {
    ...(entiteFilter ?? {}),
    ...(roleId?.length ? { roleId: { in: roleId } } : {}),
    ...(active !== undefined ? { active } : {}),
    ...(searchConditions ? { OR: searchConditions } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: offset,
      ...(typeof limit === 'number' ? { take: limit } : {}),
      orderBy: { [sort]: order },
      include: { role: true },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data,
    total,
  };
};

export const getUserById = async (id: User['id'], entiteIds: string[] | null) => {
  const entiteFilter = filterByEntities(entiteIds);
  return prisma.user.findFirst({
    where: {
      id,
      ...(entiteFilter ?? {}),
    },
    include: { role: true },
  });
};

export const getUserBySub = async (sub: User['sub']) => await prisma.user.findUnique({ where: { sub } });

export const createUser = async (newUser: CreateUserDto) => {
  const adminEmails = envVars.SUPER_ADMIN_LIST_EMAIL.split(';');
  const roleId = adminEmails.find((adminEmail) => adminEmail === newUser.email) ? ROLES.SUPER_ADMIN : ROLES.PENDING;
  const statutId = STATUT_TYPES.NON_RENSEIGNE;
  return prisma.user.create({
    data: {
      ...newUser,
      statutId,
      roleId,
      pcData: newUser.pcData as Prisma.JsonObject,
    },
  });
};
export const deleteUser = async (id: User['id']) => await prisma.user.delete({ where: { id } });

export const patchUser = async (id: User['id'], data: PatchUserDto, entiteIds: string[] | null) => {
  const user = await getUserById(id, entiteIds);

  if (!user) {
    return null;
  }

  return prisma.user.update({
    where: { id },
    data: {
      ...data,
    },
  });
};

export const getUserEntities = async (userId: User['id'], entiteIds: string[] | null) => {
  const user = await getUserById(userId, entiteIds);
  if (!user) {
    return [];
  }

  const isSuperAdmin = user.roleId === ROLES.SUPER_ADMIN;

  if (isSuperAdmin) {
    return null;
  }

  if (!user.entiteId) {
    return [];
  }

  return entitesDescendantIdsCache.get(user.entiteId);
};
