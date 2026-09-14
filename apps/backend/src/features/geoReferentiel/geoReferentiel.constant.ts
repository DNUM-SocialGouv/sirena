/**
 * Colonnes retenues dans le référentiel géographique t_geo_com (Atlasanté).
 *
 * Le fichier en compte 253 : on ne lit que celles qui alimentent la table `Commune`.
 * Les colonnes `_ACTUEL` portent la collectivité actuelle, y compris pour les communes
 * passées en `OBSOLETE` après une fusion — c'est ce qui rend un ancien code INSEE
 * toujours résolvable vers le bon département.
 */
export const COMMUNE_COLUMNS = [
  'COM_CODE',
  'COM_LIB',
  'METOMER_LIB',
  'CTCD_CODE_ACTUEL',
  'CTCD_LIB_ACTUEL',
  'DPT_CODE_ACTUEL',
  'DPT_LIB_ACTUEL',
  'REG_CODE_ACTUEL',
  'REG_LIB_ACTUEL',
] as const;

/** Colonnes de la Base officielle des codes postaux (La Poste). */
export const INSEE_POSTAL_COLUMNS = [
  '#Code_commune_INSEE',
  'Nom_de_la_commune',
  'Code_postal',
  'Libellé_d_acheminement',
  'Ligne_5',
] as const;

export const COMMUNE_DELIMITER = ',';
export const INSEE_POSTAL_DELIMITER = ';';

/**
 * Le fichier La Poste est encodé en latin-1 alors que sa réponse HTTP annonce
 * `charset=utf-8`. L'encodage est donc fixé par source, jamais déduit de la réponse.
 */
export const COMMUNE_ENCODING = 'utf-8';
export const INSEE_POSTAL_ENCODING = 'latin1';

/**
 * Garde-fous appliqués avant toute écriture en base.
 *
 * Volumes constatés en septembre 2026 : 36 847 communes, 35 511 couples (INSEE, code postal)
 * distincts pour 39 192 lignes source, et une seule ligne orpheline (Monaco, 99138).
 * À recalibrer sur les volumes réels si les sources évoluent significativement.
 */
export const GEO_GUARDS = {
  /** En deçà, la source est considérée comme tronquée. */
  MIN_COMMUNE_ROWS: 34_000,
  MIN_INSEE_POSTAL_ROWS: 33_000,
  /** Proportion de lignes illisibles au-delà de laquelle le format a probablement changé. */
  MAX_MALFORMED_RATIO: 0.001,
  /** Codes postaux rattachés à une commune inconnue du référentiel. */
  MAX_ORPHAN_POSTAL_ROWS: 100,
  /** Une suppression massive signale une source corrompue plutôt qu'une vraie évolution. */
  MAX_DELETE_RATIO: 0.02,
  MAX_DELETE_ABSOLUTE: 500,
  /** Échéance d'un téléchargement, corps compris. */
  DOWNLOAD_TIMEOUT_MS: 5 * 60 * 1000,
  /** Échéance de la transaction d'écriture, large pour couvrir la synchronisation initiale. */
  WRITE_TIMEOUT_MS: 5 * 60 * 1000,
  /** Taille des lots d'écriture. */
  BATCH_SIZE: 1_000,
  /** Nombre maximum de territoires listés dans le rapport de couverture persisté. */
  COVERAGE_REPORT_MAX_ITEMS: 50,
} as const;
