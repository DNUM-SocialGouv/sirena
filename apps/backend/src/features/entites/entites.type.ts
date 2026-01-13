export type EntiteChain = {
  id: string;
  nomComplet: string;
  entiteMereId: string | null;
  label: string;
};

export type EntiteTraitementInput = {
  id: string;
  nomComplet: string;
  entiteMereId: string | null;
};

export type EntiteTraitement = {
  entiteId: string;
  directionServiceId?: string;
  entiteName: string;
  directionServiceName?: string;
  chain: Array<{ id: string; nomComplet: string; label: string }>;
};
