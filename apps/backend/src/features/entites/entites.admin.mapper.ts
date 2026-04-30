type EntiteAdmin = {
  id: string;
  nomComplet: string;
  label: string;
  email: string;
  emailContactUsager: string;
  telContactUsager: string;
  adresseContactUsager: string;
  isActive: boolean;
  entiteMereId: string | null;
  entiteTypeId: string;
};

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

const computeContactUsager = (entite: EntiteAdmin) =>
  [entite.emailContactUsager, entite.telContactUsager, entite.adresseContactUsager]
    .filter((value) => value && value.trim().length > 0)
    .join(' · ');

const compareByNomComplet = (a: EntiteAdmin, b: EntiteAdmin) => a.nomComplet.localeCompare(b.nomComplet);

const getRootTypeOrder = (entiteTypeId: string) => {
  const index = ORDER_ENTITE_TYPE.indexOf(entiteTypeId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

const compareRootEntiteType = (a: EntiteAdmin, b: EntiteAdmin) => {
  const aIndex = getRootTypeOrder(a.entiteTypeId);
  const bIndex = getRootTypeOrder(b.entiteTypeId);

  if (aIndex !== bIndex) {
    return aIndex - bIndex;
  }

  return compareByNomComplet(a, b);
};

const buildTreeOrder = (entites: EntiteAdmin[]) => {
  const childrenByParentId = new Map<string, EntiteAdmin[]>();

  const sortedChildren = entites.filter((entite) => entite.entiteMereId !== null).toSorted(compareByNomComplet);

  for (const entite of sortedChildren) {
    if (entite.entiteMereId === null) {
      continue;
    }

    const siblings = childrenByParentId.get(entite.entiteMereId) ?? [];
    siblings.push(entite);
    childrenByParentId.set(entite.entiteMereId, siblings);
  }

  const roots = entites.filter((entite) => entite.entiteMereId === null).sort(compareRootEntiteType);

  const ordered: EntiteAdmin[] = [];

  const visit = (entite: EntiteAdmin) => {
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

const getAncestors = (entite: EntiteAdmin, entitesById: Map<string, EntiteAdmin>) => {
  const ancestors: EntiteAdmin[] = [];
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

const buildRow = (
  entite: EntiteAdmin,
  values: Pick<
    AdminEntiteRow,
    'entiteNom' | 'entiteLabel' | 'directionNom' | 'directionLabel' | 'serviceNom' | 'serviceLabel'
  >,
): AdminEntiteRow => ({
  id: entite.id,
  email: entite.email,
  contactUsager: computeContactUsager(entite),
  isActiveLabel: entite.isActive ? 'Oui' : 'Non',
  editId: entite.id,
  ...values,
});

const toAdminEntiteRow = (entite: EntiteAdmin, entitesById: Map<string, EntiteAdmin>): AdminEntiteRow => {
  const ancestors = getAncestors(entite, entitesById);

  if (ancestors.length === 0) {
    return buildRow(entite, {
      entiteNom: entite.nomComplet,
      entiteLabel: entite.label,
      directionNom: '',
      directionLabel: '',
      serviceNom: '',
      serviceLabel: '',
    });
  }

  if (ancestors.length === 1) {
    const root = ancestors[0];

    return buildRow(entite, {
      entiteNom: root.nomComplet,
      entiteLabel: root.label,
      directionNom: entite.nomComplet,
      directionLabel: entite.label,
      serviceNom: '',
      serviceLabel: '',
    });
  }

  const [root, direction] = ancestors;

  return buildRow(entite, {
    entiteNom: root.nomComplet,
    entiteLabel: root.label,
    directionNom: direction.nomComplet,
    directionLabel: direction.label,
    serviceNom: entite.nomComplet,
    serviceLabel: entite.label,
  });
};

export const buildEntitesListAdmin = (entites: EntiteAdmin[]) => {
  const entitesById = new Map(entites.map((entite) => [entite.id, entite]));
  const orderedEntites = buildTreeOrder(entites);

  return orderedEntites.map((entite) => toAdminEntiteRow(entite, entitesById));
};
