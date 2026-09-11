import { envVars } from '../../config/env.js';
import { getLoggerStore } from '../../libs/asyncLocalStorage.js';
import {
  COMMUNE_DELIMITER,
  COMMUNE_ENCODING,
  GEO_GUARDS,
  INSEE_POSTAL_DELIMITER,
  INSEE_POSTAL_ENCODING,
} from './geoReferentiel.constant.js';
import { buildEntiteCoverageReport } from './geoReferentiel.coverage.js';
import { fetchCsvLines } from './geoReferentiel.download.js';
import { parseCommunes, parseInseePostal } from './geoReferentiel.parser.js';
import {
  countPendingDeletions,
  loadExistingCommunes,
  loadExistingInseePostal,
  writeCommunes,
  writeInseePostal,
} from './geoReferentiel.repository.js';
import type { ParsedCommunes, ParsedInseePostal, SyncGeoReferentielResult } from './geoReferentiel.type.js';

export class GeoReferentielGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeoReferentielGuardError';
  }
}

export type SyncGeoReferentielOptions = {
  /** Parse et contrôle la source, rapporte le diff, n'écrit rien. */
  dryRun?: boolean;
  /** Applique les suppressions même quand leur volume déclenche le garde-fou. */
  force?: boolean;
  signal?: AbortSignal;
};

const assertMalformedRatio = (label: string, malformedRows: number, totalRows: number) => {
  if (totalRows === 0) {
    return;
  }

  const ratio = malformedRows / totalRows;
  if (ratio > GEO_GUARDS.MAX_MALFORMED_RATIO) {
    throw new GeoReferentielGuardError(
      `${label} : ${malformedRows} lignes illisibles sur ${totalRows} (${(ratio * 100).toFixed(2)} %), le format a probablement changé`,
    );
  }
};

const checkCommunes = (parsed: ParsedCommunes) => {
  if (parsed.rows.size < GEO_GUARDS.MIN_COMMUNE_ROWS) {
    throw new GeoReferentielGuardError(
      `Référentiel des communes tronqué : ${parsed.rows.size} communes lues, ${GEO_GUARDS.MIN_COMMUNE_ROWS} attendues au minimum`,
    );
  }

  assertMalformedRatio('Référentiel des communes', parsed.malformedRows, parsed.totalRows);
};

const checkInseePostal = (parsed: ParsedInseePostal) => {
  if (parsed.rows.size < GEO_GUARDS.MIN_INSEE_POSTAL_ROWS) {
    throw new GeoReferentielGuardError(
      `Référentiel des codes postaux tronqué : ${parsed.rows.size} couples lus, ${GEO_GUARDS.MIN_INSEE_POSTAL_ROWS} attendus au minimum`,
    );
  }

  if (parsed.orphanRows > GEO_GUARDS.MAX_ORPHAN_POSTAL_ROWS) {
    throw new GeoReferentielGuardError(
      `${parsed.orphanRows} codes postaux rattachés à une commune inconnue : les deux sources semblent désynchronisées`,
    );
  }

  assertMalformedRatio('Référentiel des codes postaux', parsed.malformedRows, parsed.totalRows);
};

/**
 * Décide si les suppressions peuvent être appliquées.
 *
 * Un fichier amont amputé se traduirait par une suppression massive de codes postaux, donc
 * par des requêtes qui ne trouvent plus leur territoire. Au-delà des deux seuils cumulés,
 * seules les créations et mises à jour — additives, sans perte — sont appliquées.
 */
const canApplyDeletions = (pendingDeletions: number, existingCount: number, force: boolean) => {
  if (force || pendingDeletions === 0 || existingCount === 0) {
    return true;
  }

  const ratio = pendingDeletions / existingCount;
  return ratio <= GEO_GUARDS.MAX_DELETE_RATIO || pendingDeletions <= GEO_GUARDS.MAX_DELETE_ABSOLUTE;
};

/**
 * Rafraîchit les tables `Commune` et `InseePostal` depuis les référentiels publics.
 *
 * Les deux sources sont intégralement lues et contrôlées en mémoire avant la moindre
 * écriture : une source tronquée ou au format modifié échoue sans laisser la base à
 * moitié mise à jour. L'opération est idempotente, seules les lignes réellement
 * différentes sont réécrites.
 */
export const syncGeoReferentiel = async (
  options: SyncGeoReferentielOptions = {},
): Promise<SyncGeoReferentielResult> => {
  const logger = getLoggerStore();
  const { dryRun = false, force = false, signal } = options;

  logger.info({ dryRun, force }, 'Synchronisation du référentiel géographique : téléchargement des communes');
  const communes = await parseCommunes(
    fetchCsvLines(envVars.GEO_REFERENTIEL_COMMUNES_URL, {
      encoding: COMMUNE_ENCODING,
      delimiter: COMMUNE_DELIMITER,
      signal,
    }),
  );
  checkCommunes(communes);

  logger.info(
    { communes: communes.rows.size, malformees: communes.malformedRows },
    'Communes lues, téléchargement des codes postaux',
  );
  const inseePostal = await parseInseePostal(
    fetchCsvLines(envVars.GEO_REFERENTIEL_POSTAL_URL, {
      encoding: INSEE_POSTAL_ENCODING,
      delimiter: INSEE_POSTAL_DELIMITER,
      signal,
    }),
    new Set(communes.rows.keys()),
  );
  checkInseePostal(inseePostal);

  logger.info(
    {
      codesPostaux: inseePostal.rows.size,
      doublons: inseePostal.duplicateRows,
      orphelins: inseePostal.orphanRows,
      malformees: inseePostal.malformedRows,
    },
    'Codes postaux lus, comparaison avec la base',
  );

  const [existingCommunes, existingInseePostal] = await Promise.all([
    loadExistingCommunes(),
    loadExistingInseePostal(),
  ]);

  const pendingDeletions = countPendingDeletions(inseePostal.rows, existingInseePostal);
  const applyDeletions = canApplyDeletions(pendingDeletions, existingInseePostal.size, force);

  if (!applyDeletions) {
    logger.error(
      { pendingDeletions, existing: existingInseePostal.size },
      'Suppressions inhabituellement nombreuses : elles sont ignorées, seuls les ajouts et mises à jour sont appliqués',
    );
  }

  const communesResult = await writeCommunes(communes.rows, existingCommunes, { dryRun });
  const inseePostalResult = await writeInseePostal(inseePostal.rows, existingInseePostal, {
    applyDeletions,
    dryRun,
  });

  if (communesResult.orphans > 0) {
    logger.warn(
      { orphanCommunes: communesResult.orphans },
      'Communes présentes en base et absentes de la source : conservées pour rester résolvables',
    );
  }

  const coverage = await buildEntiteCoverageReport();

  if (coverage.missing.length > 0) {
    logger.warn(
      {
        missingCdCount: coverage.missingCdCount,
        missingDdCount: coverage.missingDdCount,
        missing: coverage.missing.slice(0, GEO_GUARDS.COVERAGE_REPORT_MAX_ITEMS),
      },
      'Territoires sans entité CD ou DDETS correspondante',
    );
  }

  const result: SyncGeoReferentielResult = {
    communes: communesResult,
    inseePostal: inseePostalResult,
    orphanCommunes: communesResult.orphans,
    duplicateRows: inseePostal.duplicateRows,
    orphanPostalRows: inseePostal.orphanRows,
    deletionsSkipped: !applyDeletions,
    coverage: {
      ...coverage,
      missing: coverage.missing.slice(0, GEO_GUARDS.COVERAGE_REPORT_MAX_ITEMS),
    },
  };

  logger.info({ ...result, coverage: undefined }, 'Synchronisation du référentiel géographique terminée');

  return result;
};
