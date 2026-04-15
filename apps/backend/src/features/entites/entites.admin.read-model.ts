import type { Entite } from '../../libs/prisma.js';

type AdminEntiteRow = {
  id: string;
  entiteNom: string;
  entiteLabel: string;
  directionNom: string;
  directionLabel: string;
  serviceNom: string;
  serviceLabel: string;
  email: string;
  contactUsager: string;
  isActiveLabel: 'Oui' | 'Non';
  editId: string;
};

const ORDER_ENTITE_TYPE = ['ARS', 'CD', 'DD'];

const computeContactUsager = (entite: Entite) =>
  [entite.emailContactUsager, entite.telContactUsager, entite.adresseContactUsager]
    .filter((value) => value && value.trim().length > 0)
    .join(' · ');

const compareByNomComplet = (a: Entite, b: Entite) => a.nomComplet.localeCompare(b.nomComplet);

const getRootTypeOrder = (entiteTypeId: string) => {
  const index = ORDER_ENTITE_TYPE.indexOf(entiteTypeId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

const compareRootEntiteType = (a: Entite, b: Entite) => {
  const aIndex = getRootTypeOrder(a.entiteTypeId);
  const bIndex = getRootTypeOrder(b.entiteTypeId);

  if (aIndex !== bIndex) {
    return aIndex - bIndex;
  }

  return compareByNomComplet(a, b);
};

const buildTreeOrder = (entites: Entite[]) => {
  const childrenByParentId = new Map<string, Entite[]>();

  for (const entite of entites) {
    if (!entite.entiteMereId) {
      continue;
    }

    const siblings = childrenByParentId.get(entite.entiteMereId) ?? [];
    siblings.push(entite);
    childrenByParentId.set(entite.entiteMereId, siblings);
  }

  for (const children of childrenByParentId.values()) {
    children.sort(compareByNomComplet);
  }

  const roots = entites.filter((entite) => entite.entiteMereId === null).sort(compareRootEntiteType);

  const ordered: Entite[] = [];

  const visit = (entite: Entite) => {
    ordered.push(entite);

    const children = childrenByParentId.get(entite.id) ?? [];
    for (const child of children) {
      visit(child);
    }
  };

  for (const root of roots) {
    visit(root);
  }

  return ordered;
};

const getAncestors = (entite: Entite, entitesById: Map<string, Entite>) => {
  const ancestors: Entite[] = [];
  let currentParentId = entite.entiteMereId;

  while (currentParentId) {
    const parent = entitesById.get(currentParentId);
    if (!parent) {
      break;
    }

    ancestors.unshift(parent);
    currentParentId = parent.entiteMereId;
  }

  return ancestors;
};

const toAdminEntiteRow = (entite: Entite, entitesById: Map<string, Entite>): AdminEntiteRow => {
  const ancestors = getAncestors(entite, entitesById);

  if (ancestors.length === 0) {
    return {
      id: entite.id,
      entiteNom: entite.nomComplet,
      entiteLabel: entite.label,
      directionNom: '',
      directionLabel: '',
      serviceNom: '',
      serviceLabel: '',
      email: entite.email,
      contactUsager: computeContactUsager(entite),
      isActiveLabel: entite.isActive ? 'Oui' : 'Non',
      editId: entite.id,
    };
  }

  if (ancestors.length === 1) {
    const root = ancestors[0];

    return {
      id: entite.id,
      entiteNom: root.nomComplet,
      entiteLabel: root.label,
      directionNom: entite.nomComplet,
      directionLabel: entite.label,
      serviceNom: '',
      serviceLabel: '',
      email: entite.email,
      contactUsager: computeContactUsager(entite),
      isActiveLabel: entite.isActive ? 'Oui' : 'Non',
      editId: entite.id,
    };
  }

  const [root, direction] = ancestors;

  return {
    id: entite.id,
    entiteNom: root.nomComplet,
    entiteLabel: root.label,
    directionNom: direction.nomComplet,
    directionLabel: direction.label,
    serviceNom: entite.nomComplet,
    serviceLabel: entite.label,
    email: entite.email,
    contactUsager: computeContactUsager(entite),
    isActiveLabel: entite.isActive ? 'Oui' : 'Non',
    editId: entite.id,
  };
};

export const buildAdminEntitesList = (entites: Entite[]) => {
  const entitesById = new Map(entites.map((entite) => [entite.id, entite]));
  const orderedEntites = buildTreeOrder(entites);

  return orderedEntites.map((entite) => toAdminEntiteRow(entite, entitesById));
};
