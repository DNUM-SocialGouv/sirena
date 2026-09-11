import { readCsvRows } from '../../helpers/csv.js';
import {
  COMMUNE_COLUMNS,
  COMMUNE_DELIMITER,
  INSEE_POSTAL_COLUMNS,
  INSEE_POSTAL_DELIMITER,
} from './geoReferentiel.constant.js';
import type { CommuneRow, InseePostalRow, ParsedCommunes, ParsedInseePostal } from './geoReferentiel.type.js';

/** Clé d'unicité de la table `InseePostal`. */
export const inseePostalKey = (codeInsee: string, codePostal: string) => `${codeInsee}|${codePostal}`;

const emptyToNull = (value: string) => (value === '' ? null : value);

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

  const stats = await readCsvRows(
    lines,
    { label: 'Référentiel des communes', delimiter: COMMUNE_DELIMITER, columns: COMMUNE_COLUMNS },
    (field) => {
      const comCode = field('COM_CODE');
      if (!comCode) {
        return false;
      }

      rows.set(comCode, {
        comCode,
        comLib: field('COM_LIB'),
        metomerLib: field('METOMER_LIB'),
        ctcdCodeActuel: field('CTCD_CODE_ACTUEL'),
        ctcdLibActuel: field('CTCD_LIB_ACTUEL'),
        dptCodeActuel: field('DPT_CODE_ACTUEL'),
        dptLibActuel: field('DPT_LIB_ACTUEL'),
        regCodeActuel: field('REG_CODE_ACTUEL'),
        regLibActuel: field('REG_LIB_ACTUEL'),
      });

      return true;
    },
  );

  return { rows, ...stats };
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
  let duplicateRows = 0;
  let orphanRows = 0;

  const stats = await readCsvRows(
    lines,
    { label: 'Référentiel des codes postaux', delimiter: INSEE_POSTAL_DELIMITER, columns: INSEE_POSTAL_COLUMNS },
    (field) => {
      const codeInsee = field('#Code_commune_INSEE');
      const codePostal = field('Code_postal');

      if (!codeInsee || !codePostal) {
        return false;
      }

      if (!knownComCodes.has(codeInsee)) {
        orphanRows++;
        return true;
      }

      const key = inseePostalKey(codeInsee, codePostal);
      if (rows.has(key)) {
        duplicateRows++;
        return true;
      }

      rows.set(key, {
        codeInsee,
        codePostal,
        nomCommune: field('Nom_de_la_commune'),
        libelleAcheminement: emptyToNull(field('Libellé_d_acheminement')),
        ligne5: emptyToNull(field('Ligne_5')),
      });

      return true;
    },
  );

  return { rows, duplicateRows, orphanRows, ...stats };
};
