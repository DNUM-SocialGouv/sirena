/**
 * Parsing CSV incrémental, ligne par ligne.
 *
 * Les référentiels géographiques amont pèsent jusqu'à 160 Mo décompressés : ils sont traités
 * en flux, une ligne à la fois, et ne peuvent donc pas passer par un parseur qui exige la
 * chaîne complète en mémoire (contrairement à celui de `scripts/diff-entites.ts`).
 */

export class CsvHeaderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvHeaderError';
  }
}

/**
 * Découpe une ligne CSV en champs, en respectant les guillemets et les `""` échappés.
 *
 * Un guillemet n'ouvre un champ cité qu'en début de champ — même règle que le découpage en
 * enregistrements de `geoReferentiel.download.ts`, dont ce découpage-ci est la suite. Les
 * deux doivent rester d'accord : un guillemet isolé au milieu d'un champ non cité que
 * l'un traite comme une donnée et l'autre comme une ouverture de citation décale le compte
 * des champs, et la ligne finit silencieusement au compteur des illisibles.
 */
export const parseCsvLine = (line: string, delimiter: string): string[] => {
  const fields: string[] = [];
  let field = '';
  let inQuotes = false;
  let atFieldStart = true;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char !== '"') {
        field += char;
        continue;
      }

      // Un guillemet doublé à l'intérieur d'un champ cité est un guillemet littéral.
      if (line[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = false;
      }
      continue;
    }

    if (char === '"' && atFieldStart) {
      inQuotes = true;
      atFieldStart = false;
      continue;
    }

    if (char === delimiter) {
      fields.push(field);
      field = '';
      atFieldStart = true;
      continue;
    }

    atFieldStart = false;
    field += char;
  }

  fields.push(field);
  return fields;
};

/**
 * Associe chaque nom de colonne attendu à son index dans l'en-tête.
 *
 * Résoudre par nom plutôt que par position protège d'un réordonnancement des colonnes en
 * amont, et sert de garde-fou : une réponse HTTP qui n'est pas le CSV attendu (page d'erreur,
 * redirection non suivie) n'a aucune des colonnes demandées et échoue ici, avant tout traitement.
 */
export const resolveColumns = <K extends string>(header: string[], names: readonly K[]): Record<K, number> => {
  const indexes = {} as Record<K, number>;

  for (const name of names) {
    const index = header.indexOf(name);
    if (index === -1) {
      throw new CsvHeaderError(`Colonne "${name}" absente de l'en-tête (${header.length} colonnes trouvées)`);
    }
    indexes[name] = index;
  }

  return indexes;
};

export type CsvReadStats = {
  totalRows: number;
  malformedRows: number;
};

type ReadCsvRowsOptions<K extends string> = {
  /** Désigne la source dans les messages d'erreur. */
  label: string;
  delimiter: string;
  columns: readonly K[];
};

/**
 * Parcourt un CSV ligne à ligne et confie chaque ligne de données à `onRow`.
 *
 * L'en-tête est résolu sur la première ligne, les lignes vides sont ignorées, et une ligne
 * dont le nombre de champs diffère de l'en-tête est comptée comme illisible sans atteindre
 * `onRow`. Celui-ci lit les champs par nom de colonne, déjà détourés, et renvoie `false`
 * pour signaler une ligne qu'il juge à son tour inexploitable — un code de commune vide,
 * par exemple — qui rejoint alors le même compteur.
 */
export const readCsvRows = async <K extends string>(
  lines: AsyncIterable<string>,
  options: ReadCsvRowsOptions<K>,
  onRow: (field: (column: K) => string) => boolean,
): Promise<CsvReadStats> => {
  let columns: Record<K, number> | null = null;
  let headerLength = 0;
  let totalRows = 0;
  let malformedRows = 0;

  for await (const line of lines) {
    const fields = parseCsvLine(line, options.delimiter);

    if (!columns) {
      columns = resolveColumns(fields, options.columns);
      headerLength = fields.length;
      continue;
    }

    if (line.trim() === '') {
      continue;
    }

    totalRows++;

    if (fields.length !== headerLength) {
      malformedRows++;
      continue;
    }

    const indexes = columns;
    if (!onRow((column) => fields[indexes[column]].trim())) {
      malformedRows++;
    }
  }

  if (!columns) {
    throw new CsvHeaderError(`${options.label} vide : aucun en-tête trouvé`);
  }

  return { totalRows, malformedRows };
};
