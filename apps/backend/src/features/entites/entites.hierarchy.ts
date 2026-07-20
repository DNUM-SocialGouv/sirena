type EntiteWithParent = {
  entiteMereId: string | null;
};

type EntiteWithIdAndParent = EntiteWithParent & {
  id: string;
};

export type AdminLocalAssignmentLevel = 'entite-administrative' | 'direction' | 'service' | 'invalid-hierarchy';

export const getAdminLocalAssignmentLevel = <TEntite extends EntiteWithIdAndParent>(
  assignedEntite: TEntite,
  entitesById: Map<string, TEntite>,
): AdminLocalAssignmentLevel => {
  if (assignedEntite.entiteMereId === null) {
    return 'entite-administrative';
  }

  const parent = entitesById.get(assignedEntite.entiteMereId);

  if (!parent) {
    return 'invalid-hierarchy';
  }

  if (parent.entiteMereId === null) {
    return 'direction';
  }

  const grandparent = entitesById.get(parent.entiteMereId);
  return grandparent?.entiteMereId === null ? 'service' : 'invalid-hierarchy';
};

export const groupEntitesByParentId = <TEntite extends EntiteWithParent>(entites: TEntite[]) => {
  const entitesParEntiteMere = new Map<string, TEntite[]>();

  for (const entite of entites) {
    if (entite.entiteMereId === null) {
      continue;
    }

    const entitesEnfants = entitesParEntiteMere.get(entite.entiteMereId) ?? [];
    entitesEnfants.push(entite);
    entitesParEntiteMere.set(entite.entiteMereId, entitesEnfants);
  }

  return entitesParEntiteMere;
};
