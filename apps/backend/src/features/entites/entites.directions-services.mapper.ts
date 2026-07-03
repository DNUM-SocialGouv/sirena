type EntiteAdminLocal = {
  id: string;
  nomComplet: string;
  label: string;
  email: string;
  entiteMereId: string | null;
};

type DirectionsServicesRow = {
  id: string;
  directionNom: string;
  directionLabel: string;
  serviceNom: string;
  serviceLabel: string;
  email: string;
  editId: string;
};

const compareByNomComplet = (a: EntiteAdminLocal, b: EntiteAdminLocal) => a.nomComplet.localeCompare(b.nomComplet);

const rowMatchesSearch = (row: DirectionsServicesRow, search: string) => {
  const normalizedSearch = search.trim().toLocaleLowerCase('fr');

  if (!normalizedSearch) {
    return true;
  }

  return [row.directionNom, row.directionLabel, row.serviceNom, row.serviceLabel].some((value) =>
    value.toLocaleLowerCase('fr').includes(normalizedSearch),
  );
};

export const buildDirectionsServicesRows = (
  entitesAdminLocal: EntiteAdminLocal[],
  { search = '' }: { search?: string } = {},
): DirectionsServicesRow[] => {
  const childrenByParentId = new Map<string, EntiteAdminLocal[]>();

  for (const entite of entitesAdminLocal) {
    if (entite.entiteMereId === null) {
      continue;
    }

    const siblings = childrenByParentId.get(entite.entiteMereId) ?? [];
    siblings.push(entite);
    childrenByParentId.set(entite.entiteMereId, siblings);
  }

  for (const siblings of childrenByParentId.values()) {
    siblings.sort(compareByNomComplet);
  }

  const adminLocalEntiteIds = new Set(entitesAdminLocal.map((entite) => entite.id));
  const adminLocalRoots = entitesAdminLocal
    .filter((entite) => entite.entiteMereId === null || !adminLocalEntiteIds.has(entite.entiteMereId))
    .sort(compareByNomComplet);
  const rows: DirectionsServicesRow[] = [];

  const pushServiceRows = (direction: EntiteAdminLocal) => {
    const services = childrenByParentId.get(direction.id) ?? [];
    for (const service of services) {
      rows.push({
        id: service.id,
        directionNom: direction.nomComplet,
        directionLabel: direction.label,
        serviceNom: service.nomComplet,
        serviceLabel: service.label,
        email: service.email,
        editId: service.id,
      });
    }
  };

  for (const adminLocalRoot of adminLocalRoots) {
    if (adminLocalRoot.entiteMereId !== null) {
      pushServiceRows(adminLocalRoot);
      continue;
    }

    const directions = childrenByParentId.get(adminLocalRoot.id) ?? [];

    for (const direction of directions) {
      rows.push({
        id: direction.id,
        directionNom: direction.nomComplet,
        directionLabel: direction.label,
        serviceNom: '',
        serviceLabel: '',
        email: direction.email,
        editId: direction.id,
      });

      pushServiceRows(direction);
    }
  }

  return rows.filter((row) => rowMatchesSearch(row, search));
};
