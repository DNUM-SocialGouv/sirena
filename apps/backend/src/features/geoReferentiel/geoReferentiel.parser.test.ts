import { describe, expect, it } from 'vitest';
import { CsvHeaderError } from '../../helpers/csv.js';
import { inseePostalKey, parseCommunes, parseInseePostal } from './geoReferentiel.parser.js';

const asLines = async function* (lines: string[]) {
  for (const line of lines) {
    yield line;
  }
};

const COMMUNE_HEADER =
  '"SOURCE","COM_CODE","COM_LIB","COM_STATUT","COM_HISTOMAJ","METOMER_LIB","COM_CODE_ACTUEL",' +
  '"CTCD_CODE_ACTUEL","CTCD_LIB_ACTUEL","DPT_CODE_ACTUEL","DPT_LIB_ACTUEL","REG_CODE_ACTUEL","REG_LIB_ACTUEL"';

const communeLine = (fields: Partial<Record<string, string>> = {}) => {
  const values = {
    SOURCE: 'DataSanté',
    COM_CODE: '01001',
    COM_LIB: "L'Abergement-Clémenciat",
    COM_STATUT: 'ACTUELLE',
    COM_HISTOMAJ: '',
    METOMER_LIB: 'Métropole',
    COM_CODE_ACTUEL: '01001',
    CTCD_CODE_ACTUEL: '01D',
    CTCD_LIB_ACTUEL: "Conseil départemental de L'Ain",
    DPT_CODE_ACTUEL: '01',
    DPT_LIB_ACTUEL: 'Ain',
    REG_CODE_ACTUEL: '84',
    REG_LIB_ACTUEL: 'Auvergne-Rhône-Alpes',
    ...fields,
  };
  return Object.values(values)
    .map((value) => `"${value}"`)
    .join(',');
};

const POSTAL_HEADER = '#Code_commune_INSEE;Nom_de_la_commune;Code_postal;Libellé_d_acheminement;Ligne_5';

describe('parseCommunes', () => {
  it('should map the retained columns of a current commune', async () => {
    const { rows, totalRows, malformedRows } = await parseCommunes(asLines([COMMUNE_HEADER, communeLine()]));

    expect(totalRows).toBe(1);
    expect(malformedRows).toBe(0);
    expect(rows.get('01001')).toEqual({
      comCode: '01001',
      comLib: "L'Abergement-Clémenciat",
      metomerLib: 'Métropole',
      ctcdCodeActuel: '01D',
      ctcdLibActuel: "Conseil départemental de L'Ain",
      dptCodeActuel: '01',
      dptLibActuel: 'Ain',
      regCodeActuel: '84',
      regLibActuel: 'Auvergne-Rhône-Alpes',
    });
  });

  it('should keep a merged commune, pointing at its current collectivite', async () => {
    // Béon a fusionné en 2023 dans Ceyzérieu (01138) : le code INSEE historique doit rester
    // résolvable, et pointer vers le departement et le CD actuels.
    const merged = communeLine({
      COM_CODE: '01039',
      COM_LIB: 'Béon',
      COM_STATUT: 'OBSOLETE',
      COM_HISTOMAJ: '2023-01-01_Fusion',
      COM_CODE_ACTUEL: '01138',
    });

    const { rows } = await parseCommunes(asLines([COMMUNE_HEADER, merged]));

    expect(rows.get('01039')).toMatchObject({ comCode: '01039', ctcdCodeActuel: '01D', dptCodeActuel: '01' });
  });

  it('should keep municipal arrondissements and overseas collectivites', async () => {
    const lines = [
      COMMUNE_HEADER,
      communeLine({ COM_CODE: '75101', COM_LIB: 'Paris 1er Arrondissement', CTCD_CODE_ACTUEL: '75C' }),
      communeLine({ COM_CODE: '97701', COM_LIB: 'Saint-Barthélemy', METOMER_LIB: "Collectivité d'outre-mer" }),
    ];

    const { rows } = await parseCommunes(asLines(lines));

    expect(rows.get('75101')?.ctcdCodeActuel).toBe('75C');
    expect(rows.get('97701')).toBeDefined();
  });

  it('should resolve columns by name whatever their position', async () => {
    const header =
      '"COM_LIB","COM_CODE","METOMER_LIB","CTCD_CODE_ACTUEL","CTCD_LIB_ACTUEL","DPT_CODE_ACTUEL","DPT_LIB_ACTUEL","REG_CODE_ACTUEL","REG_LIB_ACTUEL"';
    const line = '"Ambérieu-en-Bugey","01004","Métropole","01D","CD Ain","01","Ain","84","ARA"';

    const { rows } = await parseCommunes(asLines([header, line]));

    expect(rows.get('01004')?.comLib).toBe('Ambérieu-en-Bugey');
  });

  it('should count rows whose column count does not match the header', async () => {
    const { rows, malformedRows, totalRows } = await parseCommunes(
      asLines([COMMUNE_HEADER, communeLine(), '"01002","tronquée"']),
    );

    expect(totalRows).toBe(2);
    expect(malformedRows).toBe(1);
    expect(rows.size).toBe(1);
  });

  it('should count a row with an empty COM_CODE as malformed', async () => {
    const { rows, malformedRows } = await parseCommunes(asLines([COMMUNE_HEADER, communeLine({ COM_CODE: '' })]));

    expect(malformedRows).toBe(1);
    expect(rows.size).toBe(0);
  });

  it('should ignore blank lines', async () => {
    const { rows, totalRows } = await parseCommunes(asLines([COMMUNE_HEADER, communeLine(), '', '   ']));

    expect(totalRows).toBe(1);
    expect(rows.size).toBe(1);
  });

  it('should throw when an expected column is missing from the header', async () => {
    const header = '"COM_CODE","COM_LIB"';

    await expect(parseCommunes(asLines([header, '"01001","Ain"']))).rejects.toThrow(CsvHeaderError);
  });

  it('should throw when the payload holds no header at all', async () => {
    await expect(parseCommunes(asLines([]))).rejects.toThrow(/aucun en-tête/);
  });
});

describe('parseInseePostal', () => {
  const known = new Set(['01001', '01015', '75101']);

  it('should map a postal code row and turn empty optional fields into null', async () => {
    const lines = [POSTAL_HEADER, '01001;L ABERGEMENT CLEMENCIAT;01400;L ABERGEMENT CLEMENCIAT;'];

    const { rows, totalRows } = await parseInseePostal(asLines(lines), known);

    expect(totalRows).toBe(1);
    expect(rows.get(inseePostalKey('01001', '01400'))).toEqual({
      codeInsee: '01001',
      nomCommune: 'L ABERGEMENT CLEMENCIAT',
      codePostal: '01400',
      libelleAcheminement: 'L ABERGEMENT CLEMENCIAT',
      ligne5: null,
    });
  });

  it('should keep only the first of two rows sharing the same INSEE and postal code', async () => {
    // La source distingue ces lignes par leur Ligne_5, que la contrainte d'unicité ignore.
    const lines = [
      POSTAL_HEADER,
      '01015;ARBOYS EN BUGEY;01300;ARBOYS EN BUGEY;ARBIGNIEU',
      '01015;ARBOYS EN BUGEY;01300;ARBOYS EN BUGEY;ST BOIS',
    ];

    const { rows, duplicateRows } = await parseInseePostal(asLines(lines), known);

    expect(duplicateRows).toBe(1);
    expect(rows.size).toBe(1);
    expect(rows.get(inseePostalKey('01015', '01300'))?.ligne5).toBe('ARBIGNIEU');
  });

  it('should discard rows whose commune is unknown, such as Monaco', async () => {
    const lines = [POSTAL_HEADER, '99138;MONACO;98000;MONACO;'];

    const { rows, orphanRows } = await parseInseePostal(asLines(lines), known);

    expect(orphanRows).toBe(1);
    expect(rows.size).toBe(0);
  });

  it('should keep several postal codes for one commune', async () => {
    const lines = [POSTAL_HEADER, '75101;PARIS 01;75001;PARIS;', '75101;PARIS 01;75101;PARIS;'];

    const { rows } = await parseInseePostal(asLines(lines), known);

    expect(rows.size).toBe(2);
  });

  it('should count rows with missing fields as malformed', async () => {
    const lines = [POSTAL_HEADER, '01001;INCOMPLETE;01400', '01001;;;;'];

    const { rows, malformedRows } = await parseInseePostal(asLines(lines), known);

    expect(malformedRows).toBe(2);
    expect(rows.size).toBe(0);
  });

  it('should throw when an expected column is missing from the header', async () => {
    await expect(parseInseePostal(asLines(['a;b;c', '1;2;3']), known)).rejects.toThrow(CsvHeaderError);
  });
});
