import { ROLES, type Role, STATUT_TYPES } from '@sirena/common/constants';
import { envVars } from '@/config/env';
import { entitesDescendantIdsCache } from '@/features/entites/entites.cache';
import { sseEventManager } from '@/helpers/sse';
import { type Prisma, prisma, type User } from '@/libs/prisma';
import type { CreateUserDto, GetUsersQuery, PatchUserDto } from './users.type';

const filterByEntities = (entiteIds: string[] | null) => {
  if (!entiteIds) {
    return null;
  }
  return { entiteId: { in: entiteIds } };
};

const filterByRoles = (roles: string[] | null) => {
  if (!roles) {
    return null;
  }
  return { roleId: { in: roles } };
};

export const getUsers = async (entiteIds: string[] | null, query: GetUsersQuery = {}) => {
  const { offset = 0, limit, sort = 'nom', order = 'asc', roleId, statutId, search } = query;

  const entiteFilter = filterByEntities(entiteIds);
  const roleFilter = filterByRoles(roleId ?? null);

  const searchConditions: Prisma.UserWhereInput[] | undefined = search?.trim()
    ? [
        { prenom: { contains: search, mode: 'insensitive' } },
        { nom: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    : undefined;

  const where: Prisma.UserWhereInput = {
    ...(entiteFilter ?? {}),
    ...(roleFilter ?? {}),
    ...(statutId !== undefined ? { statutId: { in: statutId } } : {}),
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

export const getUserById = async (id: User['id'], entiteIds: string[] | null, roles: Role[] | null) => {
  const entiteFilter = filterByEntities(entiteIds);
  const roleFilter = filterByRoles(roles);
  return prisma.user.findFirst({
    where: {
      id,
      ...(entiteFilter ?? {}),
      ...(roleFilter ?? {}),
    },
    include: { role: true },
  });
};

export const getUserByEmail = async (email: User['email']) => await prisma.user.findFirst({ where: { email } });

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

export const patchUser = async (id: User['id'], data: PatchUserDto) => {
  const user = await prisma.user.update({
    where: { id },
    data: {
      ...data,
    },
  });

  if (data.statutId || data.roleId) {
    sseEventManager.emitUserStatus({
      userId: user.id,
      statutId: user.statutId,
      roleId: user.roleId,
    });
  }

  sseEventManager.emitUserList({
    action: 'updated',
    userId: user.id,
  });

  return user;
};

export const getUserEntities = async (userId: User['id'], entiteIds: string[] | null) => {
  const user = await getUserById(userId, entiteIds, null);
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
