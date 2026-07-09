type EntiteWithParent = {
  entiteMereId: string | null;
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
