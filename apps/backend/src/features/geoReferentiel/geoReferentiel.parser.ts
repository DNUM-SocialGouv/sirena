import { parseCsvLine, resolveColumns } from '../../helpers/csv.js';
import {
  COMMUNE_COLUMNS,
  COMMUNE_DELIMITER,
  INSEE_POSTAL_COLUMNS,
  INSEE_POSTAL_DELIMITER,
} from './geoReferentiel.constant.js';
import type { CommuneRow, InseePostalRow, ParsedCommunes, ParsedInseePostal } from './geoReferentiel.type.js';

/** Clé d'unicité de la table `InseePostal`. */
export const inseePostalKey = (codeInsee: string, codePostal: string) => `${codeInsee}|${codePostal}`;

const emptyToNull = (value: string | undefined) => {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
};

/**
 * Construit le référentiel des communes à partir du CSV t_geo_com.
 *
 * Les communes `OBSOLETE` (fusionnées, supprimées) sont conservées : leurs colonnes `_ACTUEL`
 * désignent la collectivité qui exerce aujourd'hui la compétence, ce qui permet de résoudre
 * une adresse portant encore un ancien code INSEE. Les arrondissements municipaux de Paris,
 * Lyon et Marseille sont conservés pour la même raison.
 */
export const parseCommunes = async (lines: AsyncIterable<string>): Promise<ParsedCommunes> => {
  const rows = new Map<string, CommuneRow>();
  let columns: Record<(typeof COMMUNE_COLUMNS)[number], number> | null = null;
  let headerLength = 0;
  let malformedRows = 0;
  let totalRows = 0;

  for await (const line of lines) {
    const fields = parseCsvLine(line, COMMUNE_DELIMITER);

    if (!columns) {
      columns = resolveColumns(fields, COMMUNE_COLUMNS);
      headerLength = fields.length;
      continue;
    }

    if (line.trim() === '') {
      continue;
    }

    totalRows++;

    const comCode = fields[columns.COM_CODE]?.trim();
    if (fields.length !== headerLength || !comCode) {
      malformedRows++;
      continue;
    }

    rows.set(comCode, {
      comCode,
      comLib: fields[columns.COM_LIB].trim(),
      metomerLib: fields[columns.METOMER_LIB].trim(),
      ctcdCodeActuel: fields[columns.CTCD_CODE_ACTUEL].trim(),
      ctcdLibActuel: fields[columns.CTCD_LIB_ACTUEL].trim(),
      dptCodeActuel: fields[columns.DPT_CODE_ACTUEL].trim(),
      dptLibActuel: fields[columns.DPT_LIB_ACTUEL].trim(),
      regCodeActuel: fields[columns.REG_CODE_ACTUEL].trim(),
      regLibActuel: fields[columns.REG_LIB_ACTUEL].trim(),
    });
  }

  if (!columns) {
    throw new Error('Référentiel des communes vide : aucun en-tête trouvé');
  }

  return { rows, malformedRows, totalRows };
};

/**
 * Construit la correspondance code INSEE / code postal à partir du CSV de La Poste.
 *
 * La source contient des lignes qui ne diffèrent que par leur `Ligne_5` (lieux-dits) et
 * violeraient la contrainte d'unicité `(codeInsee, codePostal)` : la première occurrence est
 * retenue, comme le faisait l'import initial avec `skipDuplicates`.
 *
 * Les codes postaux dont la commune est absente du référentiel sont écartés : la clé
 * étrangère les rejetterait. En pratique il s'agit de Monaco (99138).
 */
export const parseInseePostal = async (
  lines: AsyncIterable<string>,
  knownComCodes: ReadonlySet<string>,
): Promise<ParsedInseePostal> => {
  const rows = new Map<string, InseePostalRow>();
  let columns: Record<(typeof INSEE_POSTAL_COLUMNS)[number], number> | null = null;
  let headerLength = 0;
  let malformedRows = 0;
  let duplicateRows = 0;
  let orphanRows = 0;
  let totalRows = 0;

  for await (const line of lines) {
    const fields = parseCsvLine(line, INSEE_POSTAL_DELIMITER);

    if (!columns) {
      columns = resolveColumns(fields, INSEE_POSTAL_COLUMNS);
      headerLength = fields.length;
      continue;
    }

    if (line.trim() === '') {
      continue;
    }

    totalRows++;

    const codeInsee = fields[columns['#Code_commune_INSEE']]?.trim();
    const codePostal = fields[columns.Code_postal]?.trim();

    if (fields.length !== headerLength || !codeInsee || !codePostal) {
      malformedRows++;
      continue;
    }

    if (!knownComCodes.has(codeInsee)) {
      orphanRows++;
      continue;
    }

    const key = inseePostalKey(codeInsee, codePostal);
    if (rows.has(key)) {
      duplicateRows++;
      continue;
    }

    rows.set(key, {
      codeInsee,
      codePostal,
      nomCommune: fields[columns.Nom_de_la_commune].trim(),
      libelleAcheminement: emptyToNull(fields[columns['Libellé_d_acheminement']]),
      ligne5: emptyToNull(fields[columns.Ligne_5]),
    });
  }

  if (!columns) {
    throw new Error('Référentiel des codes postaux vide : aucun en-tête trouvé');
  }

  return { rows, malformedRows, duplicateRows, orphanRows, totalRows };
};
