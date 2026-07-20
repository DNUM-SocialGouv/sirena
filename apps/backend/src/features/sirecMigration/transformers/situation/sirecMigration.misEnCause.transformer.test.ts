/** biome-ignore-all lint/suspicious/noExplicitAny: <test assertions on optional fields> */
import { describe, expect, it, vi } from 'vitest';
import type { SirecFinessData, SirecReclamationData, SirecRppsData } from '../../sirecMigration.repository.js';
import { ARS_NORMANDIE_ENTITE_ID } from '../../transco/affectation/affectation.transco.js';
import { SirecDataError, SirecTranscoError } from '../../transco/sirecTransco.error.js';
import type { SirenaDeclarantData } from '../sirecMigration.declarant.transformer.js';
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
    fait: { commentaire: 'Commentaire', autresPrecisions: 'Description', motifsDeclaratifs: ['MOTIF_A'], motifs: [] },
    entiteIds,
    demarchesIds: [],
    misEnCauseData: null,
  })),
}));

vi.mock('./sirecMigration.motifsIgas.transformer.js', () => ({
  resolveMotifsIgas: vi.fn((motifsIgas: { id_igas: number; igas_type: 'in' | 'out' }[]) => {
    const outIds = motifsIgas.filter((m) => m.igas_type === 'out').map((m) => `MOTIF_OUT_${m.id_igas}`);
    const inIds = motifsIgas.filter((m) => m.igas_type === 'in').map((m) => `MOTIF_IN_${m.id_igas}`);
    if (outIds.length > 0) {
      return {
        motifs: outIds,
        commentaireSuffix: inIds.length > 0 ? `Motifs IGAS d'entrée :\n- ${inIds.join('\n- ')}` : null,
      };
    }
    return { motifs: inIds, commentaireSuffix: null };
  }),
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
      finessData.categetab === '355'
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
  SIREC_DICO: { 68: 'Addictologie', 71: 'Adultes' },
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
    serviceConcerne: number | null;
    publicConcerne: number | null;
    groupIds: number[];
    rppsData: SirecRppsData | null;
    finessData: SirecFinessData | null;
    motifsIgas: { id_igas: number; igas_type: 'in' | 'out' }[];
  }> = {},
) => ({
  id_data: 10,
  type: null,
  identifiant: null,
  autresMcType: null,
  label: null,
  adresse: null,
  serviceConcerne: null,
  publicConcerne: null,
  groupIds: [],
  rppsData: null,
  finessData: null,
  motifsIgas: [],
  ...overrides,
});

const mockFinessData: SirecFinessData = {
  id_data: 20,
  nofinesset: '750000001',
  categetab: '355',
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
  signalement: number | null = null,
) =>
  ({
    reclamation: {
      id_data: 42,
      service_recepteur_niv1: 693 as number | null,
      service_gestionnaire: null as number | null,
      sans_mc: sansMc,
      observation,
      signalement,
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

    it('should not include service_recepteur_niv1 in orphanEntiteIds when it is the national id (1)', () => {
      const sirecData = {
        ...makeData([], [makeMisEnCause({ id_data: 10 })]),
        reclamation: {
          id_data: 42,
          service_recepteur_niv1: 1,
          service_gestionnaire: null,
          sans_mc: null,
          observation: null,
          signalement: null,
        },
      } as unknown as SirecReclamationData;

      expect(() => transformSirecMisEnCauseSituations(sirecData, [])).not.toThrow();
    });

    it('should not include service_gestionnaire in orphanEntiteIds when it is the national id (1)', () => {
      const sirecData = {
        ...makeData([], [makeMisEnCause({ id_data: 10 })]),
        reclamation: {
          id_data: 42,
          service_recepteur_niv1: null,
          service_gestionnaire: 1,
          sans_mc: null,
          observation: null,
          signalement: null,
        },
      } as unknown as SirecReclamationData;

      expect(() => transformSirecMisEnCauseSituations(sirecData, [])).not.toThrow();
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

  describe('service_concerne / public_concerne', () => {
    it('should not set autrePrecision when both are null', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData([], [makeMisEnCause({ id_data: 10, type: 65, identifiant: 12345678901, rppsData: mockRppsData })]),
        [],
      );

      expect((result[0].misEnCauseData as any)?.autrePrecision).toBeUndefined();
    });

    it('should set autrePrecision with "Service concerné : " prefix and dictionary transco when service_concerne is set', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData(
          [],
          [
            makeMisEnCause({
              id_data: 10,
              type: 65,
              identifiant: 12345678901,
              rppsData: mockRppsData,
              serviceConcerne: 68,
            }),
          ],
        ),
        [],
      );

      expect((result[0].misEnCauseData as any)?.autrePrecision).toBe('Service concerné : Addictologie');
    });

    it('should set autrePrecision with "Public concerné : " prefix and dictionary transco when public_concerne is set', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData(
          [],
          [
            makeMisEnCause({
              id_data: 10,
              type: 65,
              identifiant: 12345678901,
              rppsData: mockRppsData,
              publicConcerne: 71,
            }),
          ],
        ),
        [],
      );

      expect((result[0].misEnCauseData as any)?.autrePrecision).toBe('Public concerné : Adultes');
    });

    it('should order Service concerné before Public concerné, both before Observations and Signalement', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData(
          [],
          [
            makeMisEnCause({
              id_data: 10,
              type: 65,
              identifiant: 12345678901,
              rppsData: mockRppsData,
              serviceConcerne: 68,
              publicConcerne: 71,
            }),
          ],
          null,
          'Texte obs',
          1,
        ),
        [],
      );

      expect((result[0].misEnCauseData as any)?.autrePrecision).toBe(
        'Service concerné : Addictologie\nPublic concerné : Adultes\nObservations : Texte obs\nEnregistré en tant que Signalement dans SIREC',
      );
    });

    it('should throw SirecTranscoError when service_concerne has an unknown id_dico', () => {
      expect(() =>
        transformSirecMisEnCauseSituations(
          makeData(
            [],
            [
              makeMisEnCause({
                id_data: 10,
                type: 65,
                identifiant: 12345678901,
                rppsData: mockRppsData,
                serviceConcerne: 999,
              }),
            ],
          ),
          [],
        ),
      ).toThrow(SirecTranscoError);
    });

    it('should throw SirecTranscoError when public_concerne has an unknown id_dico', () => {
      expect(() =>
        transformSirecMisEnCauseSituations(
          makeData(
            [],
            [
              makeMisEnCause({
                id_data: 10,
                type: 65,
                identifiant: 12345678901,
                rppsData: mockRppsData,
                publicConcerne: 999,
              }),
            ],
          ),
          [],
        ),
      ).toThrow(SirecTranscoError);
    });

    it('should not set autrePrecision for null misEnCauseData even when service_concerne is set', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData([], [makeMisEnCause({ id_data: 10, type: null, serviceConcerne: 68 })]),
        [],
      );

      expect(result[0].misEnCauseData).toBeNull();
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

  describe('signalement', () => {
    it('should not set autrePrecision on mis en cause when signalement is null', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData([], [makeMisEnCause({ id_data: 10, type: 65, identifiant: 12345678901, rppsData: mockRppsData })]),
        [],
      );

      expect((result[0].misEnCauseData as any)?.autrePrecision).toBeUndefined();
    });

    it('should not set autrePrecision on mis en cause when signalement is false (0)', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData(
          [],
          [makeMisEnCause({ id_data: 10, type: 65, identifiant: 12345678901, rppsData: mockRppsData })],
          null,
          null,
          0,
        ),
        [],
      );

      expect((result[0].misEnCauseData as any)?.autrePrecision).toBeUndefined();
    });

    it('should set autrePrecision when signalement is true (1) on RPPS mis en cause', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData(
          [],
          [makeMisEnCause({ id_data: 10, type: 65, identifiant: 12345678901, rppsData: mockRppsData })],
          null,
          null,
          1,
        ),
        [],
      );

      expect((result[0].misEnCauseData as any)?.autrePrecision).toBe('Enregistré en tant que Signalement dans SIREC');
    });

    it('should append the signalement line after the observation on the same mis en cause', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData(
          [],
          [makeMisEnCause({ id_data: 10, type: 65, identifiant: 12345678901, rppsData: mockRppsData })],
          null,
          'Texte obs',
          1,
        ),
        [],
      );

      expect((result[0].misEnCauseData as any)?.autrePrecision).toBe(
        'Observations : Texte obs\nEnregistré en tant que Signalement dans SIREC',
      );
    });

    it('should append the signalement line to "Sans mis en cause" when sans_mc is true', () => {
      const result = transformSirecMisEnCauseSituations(makeData([], [], 1, null, 1), []);

      expect((result[0].misEnCauseData as any)?.autrePrecision).toBe(
        'Sans mis en cause\nEnregistré en tant que Signalement dans SIREC',
      );
    });

    it('should not set autrePrecision for null misEnCauseData even when signalement is true', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData([], [makeMisEnCause({ id_data: 10, type: null })], null, null, 1),
        [],
      );

      expect(result[0].misEnCauseData).toBeNull();
    });

    it('should throw SirecTranscoError when signalement has an unknown value', () => {
      expect(() => transformSirecMisEnCauseSituations(makeData([], [], null, null, 999), [])).toThrow(
        SirecTranscoError,
      );
    });
  });

  describe('motifs IGAS', () => {
    it('should default fait.motifs to an empty array when the mis en cause has no IGAS motifs', () => {
      const result = transformSirecMisEnCauseSituations(makeData([], [makeMisEnCause({ id_data: 10 })]), []);

      expect(result[0].fait.motifs).toEqual([]);
    });

    it('should set fait.motifs from the resolved IGAS motifs of the mis en cause', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData([], [makeMisEnCause({ id_data: 10, motifsIgas: [{ id_igas: 153, igas_type: 'out' }] })]),
        [],
      );

      expect(result[0].fait.motifs).toEqual(['MOTIF_OUT_153']);
    });

    it('should append the entry motifs commentaire suffix to the base commentaire', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData(
          [],
          [
            makeMisEnCause({
              id_data: 10,
              motifsIgas: [
                { id_igas: 153, igas_type: 'out' },
                { id_igas: 122, igas_type: 'in' },
              ],
            }),
          ],
        ),
        [],
      );

      expect(result[0].fait.commentaire).toBe("Commentaire\nMotifs IGAS d'entrée :\n- MOTIF_IN_122");
    });

    it('should resolve motifs independently for each mis en cause', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData(
          [],
          [
            makeMisEnCause({ id_data: 10, motifsIgas: [{ id_igas: 153, igas_type: 'out' }] }),
            makeMisEnCause({ id_data: 20, motifsIgas: [{ id_igas: 122, igas_type: 'in' }] }),
          ],
        ),
        [],
      );

      expect(result[0].fait.motifs).toEqual(['MOTIF_OUT_153']);
      expect(result[1].fait.motifs).toEqual(['MOTIF_IN_122']);
    });
  });

  describe('ARS Normandie special rule (clear misEnCauseType on FINESS situation)', () => {
    const arsMisEnCause = () => makeMisEnCause({ id_data: 10, type: 64, identifiant: 20, finessData: mockFinessData });

    const emptyDeclarant: SirenaDeclarantData = {
      estVictime: null,
      veutGarderAnonymat: null,
      lienVictimeId: null,
      lienAutrePrecision: null,
      adresse: null,
      identite: null,
      commentaire: '',
      estSignalementProfessionnel: null,
    };

    it('should clear misEnCauseTypeId and misEnCauseTypePrecisionId when all conditions are met', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData([], [arsMisEnCause()], null, null, 1),
        [],
        [ARS_NORMANDIE_ENTITE_ID],
        null,
      );

      expect((result[0].misEnCauseData as any)?.misEnCauseTypeId).toBeNull();
      expect((result[0].misEnCauseData as any)?.misEnCauseTypePrecisionId).toBeNull();
    });

    it('should not clear when requeteEntiteIds does not include ARS Normandie', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData([], [arsMisEnCause()], null, null, 1),
        [],
        ['some-other-entite'],
        null,
      );

      expect((result[0].misEnCauseData as any)?.misEnCauseTypeId).toBe('ETABLISSEMENT');
    });

    it('should not clear when signalement is not true', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData([], [arsMisEnCause()], null, null, 0),
        [],
        [ARS_NORMANDIE_ENTITE_ID],
        null,
      );

      expect((result[0].misEnCauseData as any)?.misEnCauseTypeId).toBe('ETABLISSEMENT');
    });

    it('should not clear when declarant data is present', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData([], [arsMisEnCause()], null, null, 1),
        [],
        [ARS_NORMANDIE_ENTITE_ID],
        emptyDeclarant,
      );

      expect((result[0].misEnCauseData as any)?.misEnCauseTypeId).toBe('ETABLISSEMENT');
    });

    it('should not clear when lieuDeSurvenueData is empty (e.g. RPPS mis en cause)', () => {
      const result = transformSirecMisEnCauseSituations(
        makeData(
          [],
          [makeMisEnCause({ id_data: 10, type: 65, identifiant: 12345678901, rppsData: mockRppsData })],
          null,
          null,
          1,
        ),
        [],
        [ARS_NORMANDIE_ENTITE_ID],
        null,
      );

      expect((result[0].misEnCauseData as any)?.misEnCauseTypeId).toBe('PROFESSIONNEL_SANTE');
    });

    it('should never clear when requeteEntiteIds/declarant are omitted (defaults)', () => {
      const result = transformSirecMisEnCauseSituations(makeData([], [arsMisEnCause()], null, null, 1), []);

      expect((result[0].misEnCauseData as any)?.misEnCauseTypeId).toBe('ETABLISSEMENT');
    });
  });
});
