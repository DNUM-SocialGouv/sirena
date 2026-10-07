import { ROLES, type Role, STATUT_TYPES } from '@sirena/common/constants';
import { envVars } from '../../config/env.js';
import { sseEventManager } from '../../helpers/sse.js';
import { type Prisma, prisma, type User } from '../../libs/prisma.js';
import { entitesDescendantIdsCache } from '../entites/entites.cache.js';
import type { CreateUserDto, GetUsersQuery, PatchUserDto } from './users.type.js';

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

const getUserOrderBy = (sort: string, order: Prisma.SortOrder): Prisma.UserOrderByWithRelationInput => {
  if (sort === 'entite.nomComplet') {
    return { entite: { nomComplet: order } };
  }

  if (sort === 'role.label') {
    return { role: { label: order } };
  }

  return { [sort]: order };
};

export const getUsers = async (entiteIds: string[] | null, query: GetUsersQuery = {}) => {
  const { offset = 0, limit, sort = 'nom', order = 'asc', roleId, statutId, search } = query;

  const entiteFilter = filterByEntities(entiteIds);
  const roleFilter = filterByRoles(roleId ?? null);

  const searchConditions: Prisma.UserWhereInput | undefined = search?.trim()
    ? {
        AND: search
          .trim()
          .split(/\s+/)
          .map((word) => ({
            OR: [
              { prenom: { contains: word, mode: 'insensitive' as const } },
              { nom: { contains: word, mode: 'insensitive' as const } },
              { email: { contains: word, mode: 'insensitive' as const } },
            ],
          })),
      }
    : undefined;

  const where: Prisma.UserWhereInput = {
    ...(entiteFilter ?? {}),
    ...(roleFilter ?? {}),
    ...(statutId !== undefined ? { statutId: { in: statutId } } : {}),
    ...(searchConditions ?? {}),
  };

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: offset,
      ...(typeof limit === 'number' ? { take: limit } : {}),
      orderBy: getUserOrderBy(sort, order),
      include: {
        role: true,
        entite: {
          select: {
            nomComplet: true,
            label: true,
            entiteMereId: true,
            entiteMere: {
              select: {
                label: true,
                entiteMereId: true,
                entiteMere: { select: { label: true } },
              },
            },
          },
        },
      },
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
  const user = await prisma.user.create({
    data: {
      ...newUser,
      statutId,
      roleId,
      pcData: newUser.pcData as Prisma.JsonObject,
    },
  });

  sseEventManager.emitUserList({ action: 'created', userId: user.id, entiteId: user.entiteId });

  return user;
};

export const deleteUser = async (id: User['id']) => {
  const user = await prisma.user.delete({ where: { id } });
  sseEventManager.emitUserList({ action: 'deleted', userId: user.id, entiteId: user.entiteId });
  return user;
};

export const patchUser = async (id: User['id'], data: PatchUserDto) => {
  const previousEntiteId =
    data.entiteId === undefined
      ? undefined
      : ((await prisma.user.findUnique({ where: { id }, select: { entiteId: true } }))?.entiteId ?? null);

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...data,
    },
  });

  // A new entite changes the scope every open stream was filtered with, so it closes them like a status
  // or a role change does: the client reconnects and gets filters that match its new perimeter.
  if (data.statutId !== undefined || data.roleId !== undefined || data.entiteId !== undefined) {
    sseEventManager.emitUserStatus({
      userId: user.id,
      statutId: user.statutId,
      roleId: user.roleId,
    });
  }

  sseEventManager.emitUserList({
    action: 'updated',
    userId: user.id,
    entiteId: user.entiteId,
  });

  // The admins of the entite the user just left filter the stream on it: without a second event their
  // list keeps a row for someone who is no longer in their perimeter.
  if (previousEntiteId !== undefined && previousEntiteId !== null && previousEntiteId !== user.entiteId) {
    sseEventManager.emitUserList({
      action: 'updated',
      userId: user.id,
      entiteId: previousEntiteId,
    });
  }

  return user;
};

export const getUserEntities = async (userId: User['id'], entiteIds: string[] | null) => {
  const { entiteIds: userEntiteIds } = await getUserEntiteContext(userId, entiteIds);

  return userEntiteIds;
};

export const getUserEntiteContext = async (userId: User['id'], entiteIds: string[] | null = null) => {
  const user = await getUserById(userId, entiteIds, null);

  if (!user) {
    return { assignedEntiteId: null, entiteIds: [] };
  }

  const assignedEntiteId = user.entiteId ?? null;
  const isSuperAdmin = user.roleId === ROLES.SUPER_ADMIN;

  if (isSuperAdmin) {
    return { assignedEntiteId, entiteIds: null };
  }

  if (!assignedEntiteId) {
    return { assignedEntiteId: null, entiteIds: [] };
  }

  return { assignedEntiteId, entiteIds: await entitesDescendantIdsCache.get(assignedEntiteId) };
};
