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
 */
export const parseCsvLine = (line: string, delimiter: string): string[] => {
  const fields: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      fields.push(field);
      field = '';
      continue;
    }

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
