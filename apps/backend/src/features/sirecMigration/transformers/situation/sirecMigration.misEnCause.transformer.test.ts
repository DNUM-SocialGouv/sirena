/** biome-ignore-all lint/suspicious/noExplicitAny: <test assertions on optional fields> */
import { describe, expect, it, vi } from 'vitest';
import type { SirecFinessData, SirecReclamationData, SirecRppsData } from '../../sirecMigration.repository.js';
import { SirecDataError, SirecTranscoError } from '../../transco/sirecTransco.error.js';
import { transformSirecMisEnCauseSituations } from './sirecMigration.misEnCause.transformer.js';

vi.mock('./sirecMigration.affectation.transformer.js', () => ({
  computeSituationEntiteIds: vi.fn((ids: (number | null)[]) => {
    const result: string[] = [];
    for (const id of ids) {
      if (id === 1115) result.push('service-1', 'ars-normandie');
      else if (id === 1121) result.push('service-2', 'ars-normandie');
      else if (id === 693) {
        // ARS direct: no situationEntiteId
      } else if (id !== null && id !== 0) {
        throw new SirecTranscoError(id, 'affectation');
      }
    }
    return [...new Set(result)];
  }),
}));

vi.mock('./sirecMigration.situation.transformer.js', () => ({
  transformSirecSituation: vi.fn((_sirecData: unknown, entiteIds: string[]) => ({
    fait: { commentaire: 'Commentaire', autresPrecisions: 'Description', motifsDeclaratifs: ['MOTIF_A'] },
    entiteIds,
    demarchesIds: [],
    misEnCauseData: null,
  })),
}));

vi.mock('./sirecMigration.rpps.transformer.js', () => ({
  transformSirecRpps: vi.fn((rppsData: SirecRppsData) => ({
    kind: 'rpps',
    rpps: rppsData.rpps ?? String(rppsData.id_data),
    civilite: 'M',
    nom: rppsData.nom ?? '',
    prenom: rppsData.prenom ?? '',
    codePostal: rppsData.code_postal,
    ville: rppsData.commune,
    misEnCauseTypeId: 'PROFESSIONNEL_SANTE',
    misEnCauseTypePrecisionId: 'PROF_SANTE',
  })),
}));

vi.mock('./sirecMigration.finess.transformer.js', () => ({
  transformSirecFiness: vi.fn((finessData: SirecFinessData) => ({
    misEnCauseData: {
      kind: 'finess',
      finess: finessData.nofinesset ?? '',
      misEnCauseTypeId: 'ETABLISSEMENT',
      misEnCauseTypePrecisionId: 'ETABLISSEMENT',
      nomService: finessData.rs ?? '',
      codePostal: finessData.codepostal,
      ville: finessData.libcommune,
    },
    lieuDeSurvenueData:
      finessData.categetab === 355
        ? {
            finess: finessData.nofinesset,
            lieuTypeId: 'ETABLISSEMENT_SANTE',
            codePostal: '75010',
            categCode: '355',
            categLib: 'CH',
            adresse: { label: '', numero: '', rue: '', codePostal: '', ville: '' },
          }
        : null,
  })),
}));

vi.mock('../transco/dictionnaire.transco.js', () => ({
  SIREC_BOOLEAN_TRANSCO: { 1: true, 112: true, 0: false, 111: false },
}));

vi.mock('../transco/finessCategetab.transco.js', () => ({
  SIREC_TYPE_FINESS: 64,
}));

vi.mock('../transco/misEnCauseRpps.transco.js', () => ({
  SIREC_TYPE_RPPS: 65,
}));

vi.mock('../transco/misEnCauseAutre.transco.js', () => ({
  SIREC_TYPE_AUTRE: 67,
}));

vi.mock('./sirecMigration.autre.transformer.js', () => ({
  transformSirecAutre: vi.fn(() => ({
    kind: 'autre',
    misEnCauseTypeId: 'AUTRE_PROFESSIONNEL',
    misEnCauseTypePrecisionId: 'ACUPUNCTEUR',
    autrePrecision: 'Type de mis en cause : Acuponcteur\nNom / structure : Dr Test\nAdresse : Non renseigné',
  })),
}));

const makeMisEnCause = (
  overrides: Partial<{
    id_data: number;
    type: number | null;
    identifiant: number | null;
    autresMcType: number | null;
    label: string | null;
    adresse: string | null;
    groupIds: number[];
    rppsData: SirecRppsData | null;
    finessData: SirecFinessData | null;
  }> = {},
) => ({
  id_data: 10,
  type: null,
  identifiant: null,
  autresMcType: null,
  label: null,
  adresse: null,
  groupIds: [],
  rppsData: null,
  finessData: null,
  ...overrides,
});

const mockFinessData: SirecFinessData = {
  id_data: 20,
  nofinesset: '750000001',
  categetab: 355,
  libcategetab: 'CH',
  rs: 'Hôpital Saint-Louis',
  codepostal: '75010',
  libcommune: 'Paris',
  numvoie: 1,
  typevoie: 'RUE',
  voie: 'de la Paix',
};

const makeData = (
  groupIds: number[] = [],
  misEnCauses: ReturnType<typeof makeMisEnCause>[] = [],
  sansMc: number | null = null,
  observation: string | null = null,
) =>
  ({
    reclamation: {
      id_data: 42,
      service_recepteur_niv1: 693 as number | null,
      service_gestionnaire: null as number | null,
      sans_mc: sansMc,
      observation,
    },
    motifsDeclaresIdDicos: [],
    groupIds,
    provenances: [],
    institutionPartenaires: {},
    typeTraitementIdDicos: [],
    mainCourantes: [],
    misEnCauses,
  }) as unknown as SirecReclamationData;

const mockRppsData: SirecRppsData = {
  id_data: 12345678901,
  rpps: '12345678901',
  civilite: 'm',
  nom: 'Dupont',
  prenom: 'Jean',
  code_postal: '76000',
  commune: 'Rouen',
  libelle_prof: 'Médecin',
};

describe('sirecMigration.misEnCause.transformer.ts', () => {
  describe('when there are no mis en cause', () => {
    it('should return a single situation using situationEntiteIds', () => {
      const result = transformSirecMisEnCauseSituations(makeData(), ['ars-normandie']);

      expect(result).toHaveLength(1);
      expect(result[0].entiteIds).toEqual(['ars-normandie']);
    });

    it('should return misEnCauseData null when sans_mc is null', () => {
      const result = transformSirecMisEnCauseSituations(makeData([], [], null), []);

      expect(result[0].misEnCauseData).toBeNull();
    });

    it('should return misEnCauseData null when sans_mc is false (0)', () => {
      const result = transformSirecMisEnCauseSituations(makeData([], [], 0), []);

      expect(result[0].misEnCauseData).toBeNull();
    });

    it('should return "Sans mis en cause" misEnCauseData when sans_mc is true (1)', () => {
      const result = transformSirecMisEnCauseSituations(makeData([], [], 1), []);

      expect(result[0].misEnCauseData).toEqual({
        kind: 'autre',
        misEnCauseTypeId: null,
        misEnCauseTypePrecisionId: null,
        autrePrecision: 'Sans mis en cause',
      });
    });

    it('should return "Sans mis en cause" misEnCauseData when sans_mc is 112', () => {
      const result = transformSirecMisEnCauseSituations(makeData([], [], 112), []);

      expect(result[0].misEnCauseData?.autrePrecision).toBe('Sans mis en cause');
    });

    it('should throw SirecTranscoError when sans_mc has an unknown value', () => {
      expect(() => transformSirecMisEnCauseSituations(makeData([], [], 999), [])).toThrow(SirecTranscoError);
    });

    it('should ignore sans_mc when mis en cause records are present', () => {
      const result = transformSirecMisEnCauseSituations(makeData([], [makeMisEnCause({ id_data: 10 })], 1), []);

      expect(result[0].misEnCauseData).toBeNull();
    });
  });

  describe('when there is one mis en cause', () => {
    it('should return one situation per mis en cause', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData([1115, 1121], [makeMisEnCause({ id_data: 10, groupIds: [1115] })]),
        [],
      );

      expect(result).toHaveLength(1);
    });

    it('should include mis en cause entiteIds in the situation', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData([1115], [makeMisEnCause({ id_data: 10, groupIds: [1115] })]),
        [],
      );

      expect(result[0].entiteIds).toContain('service-1');
      expect(result[0].entiteIds).toContain('ars-normandie');
    });

    it('should include orphan groupIds (not linked to any mis en cause) in all situations', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData([1115, 1121], [makeMisEnCause({ id_data: 10, groupIds: [1115] })]),
        [],
      );

      expect(result[0].entiteIds).toContain('service-2');
    });

    it('should not duplicate entiteIds when orphan and mis en cause produce the same id', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData([1115, 1121], [makeMisEnCause({ id_data: 10, groupIds: [1115, 1121] })]),
        [],
      );

      expect(result[0].entiteIds.filter((id) => id === 'ars-normandie')).toHaveLength(1);
    });

    it('should duplicate the fait and demarchesIds for each situation', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData([], [makeMisEnCause({ id_data: 10 }), makeMisEnCause({ id_data: 20 })]),
        [],
      );

      expect(result).toHaveLength(2);
      expect(result[0].fait).toEqual(result[1].fait);
      expect(result[0].demarchesIds).toEqual(result[1].demarchesIds);
    });

    it('should set misEnCauseData to null for non-RPPS type', () => {
      const result = transformSirecMisEnCauseSituations(makeData([], [makeMisEnCause({ id_data: 10, type: 12 })]), []);

      expect(result[0].misEnCauseData).toBeNull();
    });

    it('should set misEnCauseData from RPPS data when type is 65', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData([], [makeMisEnCause({ id_data: 10, type: 65, identifiant: 12345678901, rppsData: mockRppsData })]),
        [],
      );

      expect(result[0].misEnCauseData).not.toBeNull();
      expect((result[0].misEnCauseData as any)?.rpps).toBe('12345678901');
    });

    it('should throw SirecDataError when type is 65 but rppsData is null', () => {
      expect(() =>
        transformSirecMisEnCauseSituations(
          makeData([], [makeMisEnCause({ id_data: 10, type: 65, identifiant: 999, rppsData: null })]),
          [],
        ),
      ).toThrow(SirecDataError);
    });

    it('should set misEnCauseData with kind:finess when type is 64', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData([], [makeMisEnCause({ id_data: 10, type: 64, identifiant: 20, finessData: mockFinessData })]),
        [],
      );

      expect(result[0].misEnCauseData?.kind).toBe('finess');
    });

    it('should set lieuDeSurvenueData for FINESS Case B', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData([], [makeMisEnCause({ id_data: 10, type: 64, identifiant: 20, finessData: mockFinessData })]),
        [],
      );

      expect(result[0].lieuDeSurvenueData).not.toBeNull();
      expect(result[0].lieuDeSurvenueData?.lieuTypeId).toBe('ETABLISSEMENT_SANTE');
    });

    it('should throw SirecDataError when type is 64 but finessData is null', () => {
      expect(() =>
        transformSirecMisEnCauseSituations(
          makeData([], [makeMisEnCause({ id_data: 10, type: 64, identifiant: 999, finessData: null })]),
          [],
        ),
      ).toThrow(SirecDataError);
    });

    it('should set lieuDeSurvenueData null for non-FINESS/RPPS type', () => {
      const result = transformSirecMisEnCauseSituations(makeData([], [makeMisEnCause({ id_data: 10, type: 12 })]), []);

      expect(result[0].lieuDeSurvenueData).toBeNull();
    });

    it('should set misEnCauseData with kind:autre when type is 67', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData([], [makeMisEnCause({ id_data: 10, type: 67, autresMcType: 120, label: 'Dr Test', adresse: null })]),
        [],
      );

      expect(result[0].misEnCauseData?.kind).toBe('autre');
    });

    it('should set lieuDeSurvenueData null for type 67', () => {
      const result = transformSirecMisEnCauseSituations(makeData([], [makeMisEnCause({ id_data: 10, type: 67 })]), []);

      expect(result[0].lieuDeSurvenueData).toBeNull();
    });
  });

  describe('when there are multiple mis en cause', () => {
    it('should return one situation per mis en cause', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData(
          [1115, 1121],
          [makeMisEnCause({ id_data: 10, groupIds: [1115] }), makeMisEnCause({ id_data: 20, groupIds: [1121] })],
        ),
        [],
      );

      expect(result).toHaveLength(2);
    });

    it('should include the correct mis en cause entiteIds per situation', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData(
          [1115, 1121],
          [makeMisEnCause({ id_data: 10, groupIds: [1115] }), makeMisEnCause({ id_data: 20, groupIds: [1121] })],
        ),
        [],
      );

      expect(result[0].entiteIds).toContain('service-1');
      expect(result[1].entiteIds).toContain('service-2');
    });

    it('should resolve misEnCauseData independently per situation', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData(
          [],
          [
            makeMisEnCause({ id_data: 10, type: 65, identifiant: 12345678901, rppsData: mockRppsData }),
            makeMisEnCause({ id_data: 20, type: null }),
          ],
        ),
        [],
      );

      expect(result[0].misEnCauseData).not.toBeNull();
      expect(result[1].misEnCauseData).toBeNull();
    });
  });

  describe('observation', () => {
    it('should not set autrePrecision on mis en cause when observation is null', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData(
          [],
          [makeMisEnCause({ id_data: 10, type: 65, identifiant: 12345678901, rppsData: mockRppsData })],
          null,
          null,
        ),
        [],
      );

      expect((result[0].misEnCauseData as any)?.autrePrecision).toBeUndefined();
    });

    it('should set autrePrecision with observation prefix on RPPS mis en cause', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData(
          [],
          [makeMisEnCause({ id_data: 10, type: 65, identifiant: 12345678901, rppsData: mockRppsData })],
          null,
          'Texte obs',
        ),
        [],
      );

      expect((result[0].misEnCauseData as any)?.autrePrecision).toBe('Observations : Texte obs');
    });

    it('should append observation to existing autrePrecision for type autre', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData([], [makeMisEnCause({ id_data: 10, type: 67 })], null, 'Texte obs'),
        [],
      );

      const autrePrecision = (result[0].misEnCauseData as any)?.autrePrecision as string;
      expect(autrePrecision).toContain('Observations : Texte obs');
      expect(autrePrecision.indexOf('Observations')).toBeGreaterThan(0);
    });

    it('should append observation to "Sans mis en cause" when sans_mc is true', () => {
      const result = transformSirecMisEnCauseSituations(makeData([], [], 1, 'Texte obs'), []);

      const autrePrecision = (result[0].misEnCauseData as any)?.autrePrecision as string;
      expect(autrePrecision).toBe('Sans mis en cause\nObservations : Texte obs');
    });

    it('should not set autrePrecision for null misEnCauseData even with observation', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData([], [makeMisEnCause({ id_data: 10, type: null })], null, 'Texte obs'),
        [],
      );

      expect(result[0].misEnCauseData).toBeNull();
    });

    it('should apply observation to each mis en cause when multiple', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData(
          [],
          [
            makeMisEnCause({ id_data: 10, type: 65, identifiant: 12345678901, rppsData: mockRppsData }),
            makeMisEnCause({ id_data: 20, type: 65, identifiant: 12345678901, rppsData: mockRppsData }),
          ],
          null,
          'Obs commune',
        ),
        [],
      );

      expect((result[0].misEnCauseData as any)?.autrePrecision).toBe('Observations : Obs commune');
      expect((result[1].misEnCauseData as any)?.autrePrecision).toBe('Observations : Obs commune');
    });
  });
});
