import type { EntiteType } from '@sirena/common/constants';

/** Une commune telle qu'elle sera écrite dans la table `Commune`. */
export type CommuneRow = {
  comCode: string;
  comLib: string;
  metomerLib: string;
  ctcdCodeActuel: string;
  ctcdLibActuel: string;
  dptCodeActuel: string;
  dptLibActuel: string;
  regCodeActuel: string;
  regLibActuel: string;
};

/** Un couple (code INSEE, code postal) tel qu'il sera écrit dans la table `InseePostal`. */
export type InseePostalRow = {
  codeInsee: string;
  nomCommune: string;
  codePostal: string;
  libelleAcheminement: string | null;
  ligne5: string | null;
};

/** Un couple (code INSEE, code postal) tel qu'il est stocké, son identifiant compris. */
export type StoredInseePostal = InseePostalRow & { id: string };

export type ParsedCommunes = {
  rows: Map<string, CommuneRow>;
  malformedRows: number;
  totalRows: number;
};

export type ParsedInseePostal = {
  rows: Map<string, InseePostalRow>;
  malformedRows: number;
  duplicateRows: number;
  orphanRows: number;
  totalRows: number;
};

export type WriteResult = {
  created: number;
  updated: number;
  deleted: number;
};

/**
 * Écritures à appliquer sur `Commune`, calculées avant l'ouverture de la transaction pour que
 * celle-ci ne contienne que des écritures.
 */
export type CommuneDiff = {
  toCreate: CommuneRow[];
  toUpdate: CommuneRow[];
  /** Communes présentes en base et absentes de la source : comptées, jamais supprimées. */
  orphans: number;
};

/** Écritures à appliquer sur `InseePostal`, suppressions comprises. */
export type InseePostalDiff = {
  toCreate: InseePostalRow[];
  toUpdate: Array<{ id: string; row: InseePostalRow }>;
  idsToDelete: string[];
};

/** Un territoire du référentiel sans entité racine du type attendu. */
export type MissingEntite = {
  entiteType: Extract<EntiteType, 'CD' | 'DD'>;
  departementCode: string;
  departementLib: string;
  ctcdCode: string;
  ctcdLib: string;
};

export type CoverageReport = {
  territoiresCount: number;
  missingCdCount: number;
  missingDdCount: number;
  missing: MissingEntite[];
};

export type SyncGeoReferentielResult = {
  communes: WriteResult;
  inseePostal: WriteResult;
  /** Communes présentes en base mais absentes de la source : signalées, jamais supprimées. */
  orphanCommunes: number;
  duplicateRows: number;
  orphanPostalRows: number;
  /** Vrai quand le garde-fou anti-suppression massive a bloqué les suppressions. */
  deletionsSkipped: boolean;
  coverage: CoverageReport;
};
