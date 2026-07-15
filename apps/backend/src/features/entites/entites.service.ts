import type { Pagination } from '@sirena/backend-utils/types';
import { type Entite, prisma } from '../../libs/prisma.js';
import { buildEntitesListAdmin } from './entites.admin.mapper.js';
import { buildDirectionsServicesRows as buildDirectionsServicesRowsFromHierarchy } from './entites.directions-services.mapper.js';
import { EntiteChildCreationForbiddenError, EntiteNotFoundError } from './entites.error.js';
import { getAdminLocalAssignmentLevel, groupEntitesByParentId } from './entites.hierarchy.js';
import type {
  CreateChildEntiteAdminInput,
  EntiteChain,
  EntiteTraitement,
  EntiteTraitementInput,
} from './entites.type.js';

const ADMIN_SORT_COLUMNS = [
  'entiteNom',
  'entiteLabel',
  'directionNom',
  'directionLabel',
  'serviceNom',
  'serviceLabel',
  'email',
  'contactUsager',
  'isActiveLabel',
] as const;
type AdminSortColumn = (typeof ADMIN_SORT_COLUMNS)[number];

const isAdminSortColumn = (sort: string): sort is AdminSortColumn =>
  (ADMIN_SORT_COLUMNS as readonly string[]).includes(sort);

const sortAdminRows = (rows: ReturnType<typeof buildEntitesListAdmin>, sort: AdminSortColumn, order: 'asc' | 'desc') =>
  [...rows].sort((a, b) => {
    const comparison = a[sort].localeCompare(b[sort], 'fr', { sensitivity: 'base' });
    return order === 'asc' ? comparison : -comparison;
  });

export const getEntiteForUser = async (organizationalUnit: string | null, email: string) => {
  if (organizationalUnit?.trim()) {
    const organizationalUnitTrimmed = organizationalUnit.trim();
    const entitesByOrganizationalUnit = await prisma.entite.findMany({
      where: {
        OR: [
          { organizationalUnit: organizationalUnitTrimmed },
          { organizationalUnit: { startsWith: `${organizationalUnitTrimmed},` } },
          { organizationalUnit: { endsWith: `,${organizationalUnitTrimmed}` } },
          { organizationalUnit: { contains: `,${organizationalUnitTrimmed},` } },
        ],
      },
    });
    if (entitesByOrganizationalUnit.length === 1) {
      return entitesByOrganizationalUnit[0];
    }

    const segments = organizationalUnitTrimmed
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean);
    if (segments.length > 1) {
      const candidates = await prisma.entite.findMany({
        where: {
          OR: segments.flatMap((segment) => [
            { organizationalUnit: segment },
            { organizationalUnit: { startsWith: `${segment},` } },
            { organizationalUnit: { endsWith: `,${segment}` } },
            { organizationalUnit: { contains: `,${segment},` } },
          ]),
        },
      });
      if (candidates.length === 1) {
        return candidates[0];
      }
    }
  }

  const trimmedEmail = email.trim();
  const domain = trimmedEmail.includes('@') ? trimmedEmail.split('@')[1]?.trim() : null;
  if (domain) {
    const emailDomainValue = `@${domain}`;
    const entitesByEmailDomain = await prisma.entite.findMany({
      where: { emailDomain: emailDomainValue },
    });
    if (entitesByEmailDomain.length === 1) {
      return entitesByEmailDomain[0];
    }
  }

  return null;
};

export const getEntites = async (
  entiteMere: Entite['id'] | null = null,
  { sort = 'nomComplet', order = 'asc', offset = 0, limit, search = '' }: Pagination,
) => {
  const where = {
    entiteMere: entiteMere === null ? null : { is: { id: entiteMere } },
    OR: search
      ? [
          { nomComplet: { contains: search, mode: 'insensitive' as const } },
          { label: { contains: search, mode: 'insensitive' as const } },
        ]
      : undefined,
  };

  const [data, total] = await Promise.all([
    prisma.entite.findMany({
      skip: offset,
      ...(typeof limit === 'number' ? { take: limit } : {}),
      where,
      orderBy: {
        [sort]: order,
      },
    }),
    prisma.entite.count({ where }),
  ]);

  return {
    data,
    total,
  };
};

export const getEntiteById = async (entiteId: string) =>
  await prisma.entite.findUnique({
    where: { id: entiteId },
    select: {
      id: true,
      nomComplet: true,
      label: true,
      email: true,
      emailContactUsager: true,
      adresseContactUsager: true,
      telContactUsager: true,
      isActive: true,
    },
  });

export const getEntitesListAdmin = async ({
  offset = 0,
  limit,
  rootEntiteIds,
  search,
  sort,
  order,
}: Pick<Pagination, 'offset' | 'limit' | 'search'> & {
  rootEntiteIds?: string[];
  sort?: string;
  order?: 'asc' | 'desc';
}) => {
  const entites = await prisma.entite.findMany({
    select: {
      id: true,
      nomComplet: true,
      label: true,
      email: true,
      emailContactUsager: true,
      telContactUsager: true,
      adresseContactUsager: true,
      isActive: true,
      entiteMereId: true,
      entiteTypeId: true,
    },
  });
  let orderedRows = buildEntitesListAdmin(entites, { rootEntiteIds, search });
  const total = orderedRows.length;

  if (sort && order && isAdminSortColumn(sort)) {
    orderedRows = sortAdminRows(orderedRows, sort, order);
  }

  return {
    data: limit !== undefined ? orderedRows.slice(offset, offset + limit) : orderedRows.slice(offset),
    total,
  };
};

export const getRootEntitesListAdmin = async () =>
  prisma.entite.findMany({
    where: { entiteMereId: null },
    select: {
      id: true,
      nomComplet: true,
      label: true,
    },
    orderBy: [{ entiteTypeId: 'asc' }, { nomComplet: 'asc' }],
  });

export const getDirectionServiceAdminLocal = async (assignedEntiteId: string, targetEntiteId: string) => {
  const entites = await prisma.entite.findMany({
    select: {
      id: true,
      nomComplet: true,
      label: true,
      email: true,
      entiteMereId: true,
      isActive: true,
    },
  });
  const entitesById = new Map(entites.map((entite) => [entite.id, entite]));
  const assignedEntite = entitesById.get(assignedEntiteId);
  const targetEntite = entitesById.get(targetEntiteId);
  const targetParent = targetEntite?.entiteMereId ? entitesById.get(targetEntite.entiteMereId) : undefined;

  if (!assignedEntite || !targetEntite) {
    return null;
  }

  const assignmentLevel = getAdminLocalAssignmentLevel(assignedEntite, entitesById);
  const kind =
    assignmentLevel === 'entite-administrative'
      ? targetEntite.entiteMereId === assignedEntite.id
        ? ('direction' as const)
        : targetParent?.entiteMereId === assignedEntite.id
          ? ('service' as const)
          : null
      : assignmentLevel === 'direction' && targetEntite.entiteMereId === assignedEntite.id
        ? ('service' as const)
        : null;

  if (!kind) {
    return null;
  }

  return {
    id: targetEntite.id,
    kind,
    nomComplet: targetEntite.nomComplet,
    label: targetEntite.label,
    email: targetEntite.email,
    isActive: targetEntite.isActive,
  };
};

export const editDirectionServiceAdminLocal = async (
  assignedEntiteId: string,
  targetEntiteId: string,
  data: {
    nomComplet: string;
    label: string;
    email: string;
    isActive: boolean;
  },
) => {
  const target = await getDirectionServiceAdminLocal(assignedEntiteId, targetEntiteId);

  if (!target) {
    return null;
  }

  const updatedEntite = await prisma.entite.update({
    where: { id: targetEntiteId },
    data,
    select: {
      id: true,
      nomComplet: true,
      label: true,
      email: true,
      isActive: true,
    },
  });

  return {
    id: updatedEntite.id,
    kind: target.kind,
    nomComplet: updatedEntite.nomComplet,
    label: updatedEntite.label,
    email: updatedEntite.email,
    isActive: updatedEntite.isActive,
  };
};

export const getDirectionsServicesList = async (
  entiteAdminLocalId: string,
  { search = '' }: { search?: string } = {},
) => {
  const entites = await prisma.entite.findMany({
    select: {
      id: true,
      nomComplet: true,
      label: true,
      email: true,
      entiteMereId: true,
      isActive: true,
    },
  });

  const entitesParEntiteMere = groupEntitesByParentId(entites);
  const entitesById = new Map(entites.map((entite) => [entite.id, entite]));
  const entitesAdminLocal: typeof entites = [];
  const entiteAdminLocal = entitesById.get(entiteAdminLocalId);

  const emptyCapabilities = {
    canCreateDirection: false,
    canCreateService: false,
  };

  if (!entiteAdminLocal) {
    return { data: [], capabilities: emptyCapabilities };
  }

  const assignmentLevel = getAdminLocalAssignmentLevel(entiteAdminLocal, entitesById);

  if (assignmentLevel === 'service' || assignmentLevel === 'invalid-hierarchy') {
    return {
      data: [],
      capabilities: emptyCapabilities,
    };
  }

  const buildEntitesAdminLocal = (entite: (typeof entites)[number]) => {
    entitesAdminLocal.push(entite);
    for (const entiteEnfant of entitesParEntiteMere.get(entite.id) ?? []) {
      buildEntitesAdminLocal(entiteEnfant);
    }
  };

  buildEntitesAdminLocal(entiteAdminLocal);

  const hasActiveDirection = entitesAdminLocal.some(
    (entite) => entite.entiteMereId === entiteAdminLocal.id && entite.isActive,
  );
  const canCreateService =
    assignmentLevel === 'entite-administrative'
      ? hasActiveDirection
      : assignmentLevel === 'direction' && entiteAdminLocal.isActive;

  return {
    data: buildDirectionsServicesRowsFromHierarchy(entitesAdminLocal, { search }),
    capabilities: {
      canCreateDirection: assignmentLevel === 'entite-administrative',
      canCreateService,
    },
  };
};

export const createDirectionAdminLocal = async (assignedEntiteId: string, data: CreateChildEntiteAdminInput) => {
  return createChildEntiteAdmin(assignedEntiteId, data, { requireRootParent: true });
};

export const createServiceAdminLocal = async (assignedEntiteId: string, data: CreateChildEntiteAdminInput) => {
  return createChildEntiteAdmin(assignedEntiteId, data, {
    requireActiveParent: true,
    requireDirectionParent: true,
  });
};

export const createChildEntiteAdmin = async (
  parentId: string,
  data: CreateChildEntiteAdminInput,
  options: { requireActiveParent?: boolean; requireDirectionParent?: boolean; requireRootParent?: boolean } = {},
) => {
  const parent = await prisma.entite.findUnique({
    where: { id: parentId },
    select: {
      entiteTypeId: true,
      departementCode: true,
      ctcdCode: true,
      regionCode: true,
      regLib: true,
      dptLib: true,
      entiteMereId: true,
      isActive: true,
      entiteMere: {
        select: { entiteMereId: true },
      },
    },
  });

  if (!parent) {
    throw new EntiteNotFoundError();
  }

  if (options.requireRootParent && parent.entiteMereId !== null) {
    throw new EntiteChildCreationForbiddenError();
  }

  if (
    (options.requireActiveParent && !parent.isActive) ||
    (options.requireDirectionParent && (parent.entiteMereId === null || parent.entiteMere?.entiteMereId !== null))
  ) {
    throw new EntiteChildCreationForbiddenError();
  }

  if (parent.entiteMere?.entiteMereId) {
    throw new EntiteChildCreationForbiddenError();
  }

  return prisma.entite.create({
    data: {
      ...data,
      entiteMereId: parentId,
      entiteTypeId: parent.entiteTypeId,
      departementCode: parent.departementCode,
      ctcdCode: parent.ctcdCode,
      regionCode: parent.regionCode,
      regLib: parent.regLib,
      dptLib: parent.dptLib,
    },
    select: {
      id: true,
      nomComplet: true,
      label: true,
      email: true,
      emailContactUsager: true,
      adresseContactUsager: true,
      telContactUsager: true,
      isActive: true,
    },
  });
};

export const editEntiteAdmin = async (
  entiteId: string,
  data: {
    nomComplet: string;
    label: string;
    email: string;
    emailContactUsager: string;
    adresseContactUsager: string;
    telContactUsager: string;
    isActive: boolean;
  },
) =>
  prisma.entite.update({
    where: { id: entiteId },
    data,
    select: {
      id: true,
      nomComplet: true,
      label: true,
      email: true,
      emailContactUsager: true,
      adresseContactUsager: true,
      telContactUsager: true,
      isActive: true,
    },
  });

export async function* getEntiteChainGenerator(entiteId: string) {
  let currentId: string | null = entiteId;

  while (currentId) {
    const current: EntiteChain | null = await prisma.entite.findUnique({
      where: { id: currentId },
      select: {
        id: true,
        nomComplet: true,
        entiteMereId: true,
        label: true,
        entiteTypeId: true,
      },
    });

    if (!current) break;

    yield current;

    currentId = current.entiteMereId ?? null;
  }
}

export const getEntiteChain = async (entiteId: string) => {
  const results: EntiteChain[] = [];

  for await (const entite of getEntiteChainGenerator(entiteId)) {
    results.push(entite);
  }

  return results.reverse();
};

export const getEditableEntitiesChain = async (entiteId: string, editableEntiteIds: string[] | null) => {
  const chain = await getEntiteChain(entiteId);
  const isSuperAdmin = editableEntiteIds === null;

  const shouldDisable = (id: string): boolean => {
    if (isSuperAdmin) return false;
    if (editableEntiteIds.length === 0) return true;
    const isPivot = id === editableEntiteIds[0];
    const isIncluded = editableEntiteIds.includes(id);
    return !isIncluded || isPivot;
  };

  return chain.map((entite) => ({
    ...entite,
    disabled: shouldDisable(entite.id),
  }));
};

export async function* getEntiteDescendantIdsGenerator(entiteId: string) {
  const stack: string[] = [entiteId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    const children = await prisma.entite.findMany({
      where: { entiteMereId: currentId },
      select: { id: true },
    });
    for (const child of children) {
      stack.push(child.id);
    }
    yield children.map((child) => child.id);
  }
}

export const getEntiteDescendantIds = async (entiteId: string | null) => {
  // Should be SUPER_ADMIN
  if (!entiteId) {
    return null;
  }
  const results: string[] = [entiteId];
  for await (const entite of getEntiteDescendantIdsGenerator(entiteId)) {
    results.push(...entite);
  }
  return results;
};

export const getEntitesByIds = async (ids: string[]) =>
  ids.length === 0
    ? []
    : prisma.entite.findMany({
        where: { id: { in: ids } },
      });

export const getDepartementsByRegionCode = async (regionCode: string) => {
  const rows = await prisma.commune.findMany({
    where: { regCodeActuel: regionCode },
    select: { dptCodeActuel: true, dptLibActuel: true },
    distinct: ['dptCodeActuel'],
    orderBy: { dptCodeActuel: 'asc' },
  });
  return rows.map((r) => ({ code: r.dptCodeActuel, label: r.dptLibActuel }));
};

export async function getEntiteAscendanteInfo(entiteId: string) {
  const CYCLE_LIMIT = 6;
  let currentEntiteId = entiteId;
  let n = 0;

  while (currentEntiteId) {
    n += 1;
    // Prevent infinite loop in case of cycle in entite hierarchy
    if (n > CYCLE_LIMIT) {
      break;
    }
    const lastEntiteId = await prisma.entite.findUnique({
      where: { id: currentEntiteId },
      select: { entiteMereId: true },
    });

    if (lastEntiteId === null) {
      return { entiteId: null, level: n };
    }

    if (!lastEntiteId.entiteMereId) {
      return { entiteId: currentEntiteId, level: n };
    }

    if (lastEntiteId.entiteMereId) {
      currentEntiteId = lastEntiteId.entiteMereId;
    }
  }

  // Should not happen
  throw new Error(`Possible cycle detected in entite hierarchy, ${entiteId}`);
}

export async function getEntiteAscendanteIds(entiteId: string | null) {
  if (!entiteId) {
    return null;
  }

  const { entiteId: ascendanteId } = await getEntiteAscendanteInfo(entiteId);

  // entiteId does not exists
  if (ascendanteId === null) {
    return [];
  }

  return await getEntiteDescendantIds(ascendanteId);
}

export const getDirectionsFromRequeteEntiteId = async (requeteId: string, entiteId: string) => {
  return await prisma.entite.findMany({
    where: {
      entiteMereId: entiteId,
      situationEntites: {
        some: {
          situation: {
            requeteId: requeteId,
          },
        },
      },
    },
    select: {
      id: true,
      nomComplet: true,
      label: true,
    },
  });
};

export const getDirectionsServicesFromRequeteEntiteId = async (
  requeteId: string,
  entiteId: string,
): Promise<EntiteTraitement[]> => {
  const situationEntites = await prisma.situationEntite.findMany({
    where: {
      situation: {
        requeteId,
      },
    },
    select: {
      entite: {
        select: {
          id: true,
          nomComplet: true,
          entiteMereId: true,
        },
      },
    },
  });

  const entitesTraitement = await buildEntitesTraitement(
    situationEntites.map((situationEntite) => situationEntite.entite),
  );

  return entitesTraitement.filter(
    (entiteTraitement) => entiteTraitement.entiteId === entiteId && entiteTraitement.directionServiceId !== undefined,
  );
};

export const buildEntitesTraitement = async (entites: EntiteTraitementInput[]): Promise<EntiteTraitement[]> => {
  const entitesTraitement: EntiteTraitement[] = [];
  const seen = new Set<string>();

  for (const entite of entites) {
    const chain = await getEntiteChain(entite.id);
    if (!chain.length) continue;

    const root = chain[0];
    const isRoot = entite.entiteMereId === null;

    const entiteId = root.id;
    const directionServiceId = isRoot ? undefined : entite.id;
    const directionName = isRoot ? undefined : entite.nomComplet;

    const key = `${entiteId}::${directionServiceId ?? 'null'}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    entitesTraitement.push({
      entiteId,
      entiteTypeId: root.entiteTypeId,
      entiteName: root.nomComplet,
      directionServiceId,
      directionServiceName: directionName,
      chain,
    });
  }

  return entitesTraitement;
};

/**
 * Fetches assigned ACTIVE entites for a requete (top-level active only)
 */
export async function getEntitesByRequeteId(requeteId: string) {
  const requete = await prisma.requete.findUnique({
    where: { id: requeteId },
    include: { requeteEntites: true },
  });
  if (!requete) return [];
  const entiteIds = requete.requeteEntites.map((re) => re.entiteId).filter((id): id is string => Boolean(id));
  return prisma.entite.findMany({
    where: { id: { in: entiteIds }, isActive: true },
    select: {
      id: true,
      nomComplet: true,
      emailContactUsager: true,
      telContactUsager: true,
      adresseContactUsager: true,
      entiteMereId: true,
    },
  });
}
