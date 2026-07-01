type EntiteHierarchyNode = {
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

const compareByNomComplet = (a: EntiteHierarchyNode, b: EntiteHierarchyNode) =>
  a.nomComplet.localeCompare(b.nomComplet);

export const buildDirectionsServicesRows = (scopedEntites: EntiteHierarchyNode[]): DirectionsServicesRow[] => {
  const childrenByParentId = new Map<string, EntiteHierarchyNode[]>();

  for (const entite of scopedEntites) {
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

  const roots = scopedEntites.filter((entite) => entite.entiteMereId === null).sort(compareByNomComplet);
  const rows: DirectionsServicesRow[] = [];

  for (const root of roots) {
    const directions = childrenByParentId.get(root.id) ?? [];

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
    }
  }

  return rows;
};
