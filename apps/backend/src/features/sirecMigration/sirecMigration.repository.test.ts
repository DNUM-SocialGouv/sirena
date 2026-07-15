import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mariadbPool } from '../../config/mariadb.js';
import {
  fetchSirecData,
  fetchSirecGroupIds,
  fetchSirecIdsByServiceIds,
  fetchSirecInstitutionPartenaires,
  fetchSirecMainCourantes,
  fetchSirecMcIgasMotifs,
  fetchSirecMisEnCauses,
  fetchSirecMotifsDeclaresById,
  fetchSirecProvenances,
  fetchSirecReclamationById,
  fetchSirecTypeTraitementIds,
} from './sirecMigration.repository.js';

vi.mock('../../config/mariadb.js', () => ({
  mariadbPool: {
    query: vi.fn(),
  },
}));

describe('sirecMigration.repository.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchSirecReclamationById', () => {
    it('should return the row when found', async () => {
      const mockRow = {
        id_data: 42,
        r_recept_date: new Date('2024-01-15'),
        description: 'Ma réclamation',
        reception: 12,
        prioritaire: 1,
        service_recepteur_niv1: 693,
        service_gestionnaire: null,
      };
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([mockRow]);

      const result = await fetchSirecReclamationById(42);

      expect(result).toEqual(mockRow);
      expect(mariadbPool.query).toHaveBeenCalledWith(expect.stringContaining('sire_reclamation_data'), [42]);
    });

    it('should return null when not found', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([]);

      const result = await fetchSirecReclamationById(99);

      expect(result).toBeNull();
    });

    it('should pass the sirecId as parameter', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([]);

      await fetchSirecReclamationById(123);

      expect(mariadbPool.query).toHaveBeenCalledWith(expect.any(String), [123]);
    });
  });

  describe('fetchSirecMotifsDeclaresById', () => {
    it('should return the list of id_dico when found', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([{ id_dico: 823 }, { id_dico: 809 }]);

      const result = await fetchSirecMotifsDeclaresById(42);

      expect(result).toEqual([823, 809]);
      expect(mariadbPool.query).toHaveBeenCalledWith(
        expect.stringContaining('sire_reclamation_dico_motifs_declares_data'),
        [42],
      );
    });

    it('should return an empty array when no motifs found', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([]);

      const result = await fetchSirecMotifsDeclaresById(42);

      expect(result).toEqual([]);
    });
  });

  describe('fetchSirecGroupIds', () => {
    it('should return the list of group ids when found', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([{ id_group: 3 }, { id_group: 5 }]);

      const result = await fetchSirecGroupIds(42);

      expect(result).toEqual([3, 5]);
      expect(mariadbPool.query).toHaveBeenCalledWith(expect.stringContaining('sire_reclamation_data_group'), [42]);
    });

    it('should return an empty array when no groups found', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([]);

      const result = await fetchSirecGroupIds(42);

      expect(result).toEqual([]);
    });
  });

  describe('fetchSirecProvenances', () => {
    it('should return provenances with all fields when found', async () => {
      const date = new Date('2024-03-05');
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([
        { id_provenance: 103, id_group: 693, date_signalement: date, reponse_attendue: 134 },
      ]);

      const result = await fetchSirecProvenances(42);

      expect(result).toEqual([{ id_provenance: 103, id_group: 693, date_signalement: date, reponse_attendue: 134 }]);
      expect(mariadbPool.query).toHaveBeenCalledWith(expect.stringContaining('sire_provenances_data'), [42]);
    });

    it('should handle null date_signalement and reponse_attendue', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([
        { id_provenance: 103, id_group: 693, date_signalement: null, reponse_attendue: null },
      ]);

      const result = await fetchSirecProvenances(42);

      expect(result).toEqual([{ id_provenance: 103, id_group: 693, date_signalement: null, reponse_attendue: null }]);
    });

    it('should return an empty array when no provenances found', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([]);

      const result = await fetchSirecProvenances(42);

      expect(result).toEqual([]);
    });
  });

  describe('fetchSirecInstitutionPartenaires', () => {
    it('should return a map of id_data to institution name', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([
        { id_data: 10, institution: 'CPAM de Rouen' },
        { id_data: 20, institution: 'DREETS Normandie' },
      ]);

      const result = await fetchSirecInstitutionPartenaires([10, 20]);

      expect(result).toEqual({ 10: 'CPAM de Rouen', 20: 'DREETS Normandie' });
      expect(mariadbPool.query).toHaveBeenCalledWith(expect.stringContaining('sire_institution_data'), [[10, 20]]);
    });

    it('should return an empty object without querying when ids is empty', async () => {
      const result = await fetchSirecInstitutionPartenaires([]);

      expect(result).toEqual({});
      expect(mariadbPool.query).not.toHaveBeenCalled();
    });
  });

  describe('fetchSirecTypeTraitementIds', () => {
    it('should return the list of id_dico when found', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([{ id_dico: 344 }, { id_dico: 346 }]);

      const result = await fetchSirecTypeTraitementIds(42);

      expect(result).toEqual([344, 346]);
      expect(mariadbPool.query).toHaveBeenCalledWith(
        expect.stringContaining('sire_reclamation_dico_type_traitement_data'),
        [42],
      );
    });

    it('should return an empty array when no types found', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([]);

      const result = await fetchSirecTypeTraitementIds(42);

      expect(result).toEqual([]);
    });
  });

  describe('fetchSirecMcIgasMotifs', () => {
    it('should return a map of id_mc to their IGAS motifs', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([
        { id_mc: 10, id_igas: 153, igas_type: 'out' },
        { id_mc: 10, id_igas: 122, igas_type: 'in' },
        { id_mc: 20, id_igas: 20, igas_type: 'out' },
      ]);

      const result = await fetchSirecMcIgasMotifs(42);

      expect(result).toEqual(
        new Map([
          [
            10,
            [
              { id_igas: 153, igas_type: 'out' },
              { id_igas: 122, igas_type: 'in' },
            ],
          ],
          [20, [{ id_igas: 20, igas_type: 'out' }]],
        ]),
      );
      expect(mariadbPool.query).toHaveBeenCalledWith(expect.stringContaining('sire_mc_igas_data'), [42]);
    });

    it('should return an empty map when no IGAS motifs are found', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([]);

      const result = await fetchSirecMcIgasMotifs(42);

      expect(result).toEqual(new Map());
    });
  });

  describe('fetchSirecMisEnCauses', () => {
    it('should return mis en cause with their group ids and type', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([
        {
          id_data: 10,
          type: 12,
          identifiant: null,
          id_group: 693,
          rpps_id_data: null,
          rpps_civilite: null,
          rpps_nom: null,
          rpps_prenom: null,
          rpps_code_postal: null,
          rpps_commune: null,
          rpps_libelle_prof: null,
          finess_id_data: null,
          finess_nofinesset: null,
          finess_categetab: null,
          finess_libcategetab: null,
          finess_rs: null,
          finess_codepostal: null,
          finess_libcommune: null,
          finess_numvoie: null,
          finess_typevoie: null,
          finess_voie: null,
        },
        {
          id_data: 10,
          type: 12,
          identifiant: null,
          id_group: 677,
          rpps_id_data: null,
          rpps_civilite: null,
          rpps_nom: null,
          rpps_prenom: null,
          rpps_code_postal: null,
          rpps_commune: null,
          rpps_libelle_prof: null,
          finess_id_data: null,
          finess_nofinesset: null,
          finess_categetab: null,
          finess_libcategetab: null,
          finess_rs: null,
          finess_codepostal: null,
          finess_libcommune: null,
          finess_numvoie: null,
          finess_typevoie: null,
          finess_voie: null,
        },
        {
          id_data: 20,
          type: 12,
          identifiant: null,
          id_group: 693,
          rpps_id_data: null,
          rpps_civilite: null,
          rpps_nom: null,
          rpps_prenom: null,
          rpps_code_postal: null,
          rpps_commune: null,
          rpps_libelle_prof: null,
          finess_id_data: null,
          finess_nofinesset: null,
          finess_categetab: null,
          finess_libcategetab: null,
          finess_rs: null,
          finess_codepostal: null,
          finess_libcommune: null,
          finess_numvoie: null,
          finess_typevoie: null,
          finess_voie: null,
        },
      ]);
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([]);

      const result = await fetchSirecMisEnCauses(42);

      expect(result).toEqual([
        {
          id_data: 10,
          type: 12,
          identifiant: null,
          groupIds: [693, 677],
          rppsData: null,
          finessData: null,
          motifsIgas: [],
        },
        { id_data: 20, type: 12, identifiant: null, groupIds: [693], rppsData: null, finessData: null, motifsIgas: [] },
      ]);
      expect(mariadbPool.query).toHaveBeenCalledWith(expect.stringContaining('sire_misencause_data'), [42]);
    });

    it('should populate rppsData when type is 65 and RPPS record is found', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([
        {
          id_data: 10,
          type: 65,
          identifiant: 12345678901,
          id_group: null,
          rpps_id_data: 12345678901,
          rpps_rpps: '12345678901',
          rpps_civilite: 'mme',
          rpps_nom: 'Martin',
          rpps_prenom: 'Alice',
          rpps_code_postal: '76000',
          rpps_commune: 'Rouen',
          rpps_libelle_prof: 'Médecin',
          finess_id_data: null,
          finess_nofinesset: null,
          finess_categetab: null,
          finess_libcategetab: null,
          finess_rs: null,
          finess_codepostal: null,
          finess_libcommune: null,
          finess_numvoie: null,
          finess_typevoie: null,
          finess_voie: null,
        },
      ]);
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([]);

      const result = await fetchSirecMisEnCauses(42);

      expect(result).toEqual([
        {
          id_data: 10,
          type: 65,
          identifiant: 12345678901,
          groupIds: [],
          finessData: null,
          motifsIgas: [],
          rppsData: {
            id_data: 12345678901,
            rpps: '12345678901',
            civilite: 'mme',
            nom: 'Martin',
            prenom: 'Alice',
            code_postal: '76000',
            commune: 'Rouen',
            libelle_prof: 'Médecin',
          },
        },
      ]);
    });

    it('should set rppsData to null when type is 65 but rpps_id_data is null', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([
        {
          id_data: 10,
          type: 65,
          identifiant: 999,
          id_group: null,
          rpps_id_data: null,
          rpps_civilite: null,
          rpps_nom: null,
          rpps_prenom: null,
          rpps_code_postal: null,
          rpps_commune: null,
          rpps_libelle_prof: null,
          finess_id_data: null,
          finess_nofinesset: null,
          finess_categetab: null,
          finess_libcategetab: null,
          finess_rs: null,
          finess_codepostal: null,
          finess_libcommune: null,
          finess_numvoie: null,
          finess_typevoie: null,
          finess_voie: null,
        },
      ]);
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([]);

      const result = await fetchSirecMisEnCauses(42);

      expect(result[0].rppsData).toBeNull();
    });

    it('should return mis en cause with empty groupIds when no groups are linked', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([
        {
          id_data: 10,
          type: null,
          identifiant: null,
          id_group: null,
          rpps_id_data: null,
          rpps_civilite: null,
          rpps_nom: null,
          rpps_prenom: null,
          rpps_code_postal: null,
          rpps_commune: null,
          rpps_libelle_prof: null,
          finess_id_data: null,
          finess_nofinesset: null,
          finess_categetab: null,
          finess_libcategetab: null,
          finess_rs: null,
          finess_codepostal: null,
          finess_libcommune: null,
          finess_numvoie: null,
          finess_typevoie: null,
          finess_voie: null,
        },
      ]);
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([]);

      const result = await fetchSirecMisEnCauses(42);

      expect(result).toEqual([
        { id_data: 10, type: null, identifiant: null, groupIds: [], rppsData: null, finessData: null, motifsIgas: [] },
      ]);
    });

    it('should join with sire_rpps_data and sire_finess_data in the query', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await fetchSirecMisEnCauses(42);

      expect(mariadbPool.query).toHaveBeenCalledWith(expect.stringContaining('sire_rpps_data'), [42]);
      expect(mariadbPool.query).toHaveBeenCalledWith(expect.stringContaining('sire_finess_data'), [42]);
    });

    it('should populate finessData when type is 64 and FINESS record is found', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([
        {
          id_data: 10,
          type: 64,
          identifiant: 1234,
          id_group: null,
          rpps_id_data: null,
          rpps_rpps: null,
          rpps_civilite: null,
          rpps_nom: null,
          rpps_prenom: null,
          rpps_code_postal: null,
          rpps_commune: null,
          rpps_libelle_prof: null,
          finess_id_data: 1234,
          finess_nofinesset: '750000001',
          finess_categetab: 355,
          finess_libcategetab: 'CH',
          finess_rs: 'Hôpital A',
          finess_codepostal: '75010',
          finess_libcommune: 'Paris',
          finess_numvoie: 1,
          finess_typevoie: 'RUE',
          finess_voie: 'de la Paix',
        },
      ]);
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([]);

      const result = await fetchSirecMisEnCauses(42);

      expect(result[0].finessData).toEqual({
        id_data: 1234,
        nofinesset: '750000001',
        categetab: 355,
        libcategetab: 'CH',
        rs: 'Hôpital A',
        codepostal: '75010',
        libcommune: 'Paris',
        numvoie: 1,
        typevoie: 'RUE',
        voie: 'de la Paix',
      });
      expect(result[0].rppsData).toBeNull();
    });

    it('should set finessData to null when type is 64 but finess_id_data is null', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([
        {
          id_data: 10,
          type: 64,
          identifiant: 999,
          id_group: null,
          rpps_id_data: null,
          rpps_rpps: null,
          rpps_civilite: null,
          rpps_nom: null,
          rpps_prenom: null,
          rpps_code_postal: null,
          rpps_commune: null,
          rpps_libelle_prof: null,
          finess_id_data: null,
          finess_nofinesset: null,
          finess_categetab: null,
          finess_libcategetab: null,
          finess_rs: null,
          finess_codepostal: null,
          finess_libcommune: null,
          finess_numvoie: null,
          finess_typevoie: null,
          finess_voie: null,
        },
      ]);
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([]);

      const result = await fetchSirecMisEnCauses(42);

      expect(result[0].finessData).toBeNull();
    });

    it('should return an empty array when no mis en cause found', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await fetchSirecMisEnCauses(42);

      expect(result).toEqual([]);
    });

    it('should exclude rows with identifiant = 0 in the query', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await fetchSirecMisEnCauses(42);

      expect(mariadbPool.query).toHaveBeenCalledWith(expect.stringContaining('m.identifiant != 0'), [42]);
    });

    it('should populate motifsIgas for each mis en cause from sire_mc_igas_data', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([
        {
          id_data: 10,
          type: null,
          identifiant: null,
          id_group: null,
          rpps_id_data: null,
          rpps_civilite: null,
          rpps_nom: null,
          rpps_prenom: null,
          rpps_code_postal: null,
          rpps_commune: null,
          rpps_libelle_prof: null,
          finess_id_data: null,
          finess_nofinesset: null,
          finess_categetab: null,
          finess_libcategetab: null,
          finess_rs: null,
          finess_codepostal: null,
          finess_libcommune: null,
          finess_numvoie: null,
          finess_typevoie: null,
          finess_voie: null,
        },
      ]);
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([
        { id_mc: 10, id_igas: 153, igas_type: 'out' },
        { id_mc: 10, id_igas: 122, igas_type: 'in' },
      ]);

      const result = await fetchSirecMisEnCauses(42);

      expect(result[0].motifsIgas).toEqual([
        { id_igas: 153, igas_type: 'out' },
        { id_igas: 122, igas_type: 'in' },
      ]);
    });
  });

  describe('fetchSirecMainCourantes', () => {
    it('should return main courantes with aggregated groupIds', async () => {
      const date = new Date('2024-06-01');
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([
        { id_data: 10, type_action1: 100, commentaire: 'RAS', date_action: date, id_group: 693 },
        { id_data: 10, type_action1: 100, commentaire: 'RAS', date_action: date, id_group: 677 },
        { id_data: 20, type_action1: null, commentaire: null, date_action: null, id_group: 693 },
      ]);

      const result = await fetchSirecMainCourantes(42);

      expect(result).toEqual([
        { id_data: 10, type_action1: 100, commentaire: 'RAS', date_action: date, groupIds: [693, 677] },
        { id_data: 20, type_action1: null, commentaire: null, date_action: null, groupIds: [693] },
      ]);
      expect(mariadbPool.query).toHaveBeenCalledWith(expect.stringContaining('sire_main_courante_data'), [42]);
    });

    it('should return main courante with empty groupIds when no groups are linked', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([
        { id_data: 10, type_action1: null, commentaire: null, date_action: null, id_group: null },
      ]);

      const result = await fetchSirecMainCourantes(42);

      expect(result).toEqual([{ id_data: 10, type_action1: null, commentaire: null, date_action: null, groupIds: [] }]);
    });

    it('should return an empty array when no mains courantes found', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([]);

      const result = await fetchSirecMainCourantes(42);

      expect(result).toEqual([]);
    });
  });

  describe('fetchSirecData', () => {
    const mockRow = {
      id_data: 42,
      r_recept_date: new Date('2024-01-15'),
      description: 'Ma réclamation',
      reception: 12,
      prioritaire: 1,
      service_recepteur_niv1: 693,
      service_gestionnaire: null,
      institution_part: null,
    };

    it('should return the aggregate data when the reclamation is found', async () => {
      vi.mocked(mariadbPool.query)
        .mockResolvedValueOnce([mockRow])
        .mockResolvedValueOnce([{ id_dico: 823 }, { id_dico: 809 }])
        .mockResolvedValueOnce([{ id_group: 3 }, { id_group: 5 }])
        .mockResolvedValueOnce([{ id_provenance: 103, id_group: 693, date_signalement: null, reponse_attendue: null }])
        .mockResolvedValueOnce([{ id_dico: 344 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await fetchSirecData(42);

      expect(result).toEqual({
        reclamation: mockRow,
        motifsDeclaresIdDicos: [823, 809],
        groupIds: [3, 5],
        provenances: [{ id_provenance: 103, id_group: 693, date_signalement: null, reponse_attendue: null }],
        institutionPartenaires: {},
        typeTraitementIdDicos: [344],
        misEnCauses: [],
        mainCourantes: [],
      });
    });

    it('should fetch institution partenaires when institution_part contains numeric ids', async () => {
      const rowWithInstitutions = { ...mockRow, institution_part: '10,20' };
      vi.mocked(mariadbPool.query)
        .mockResolvedValueOnce([rowWithInstitutions])
        .mockResolvedValueOnce([{ id_dico: 823 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id_data: 10, institution: 'CPAM de Rouen' },
          { id_data: 20, institution: 'DREETS Normandie' },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await fetchSirecData(42);

      expect(result?.institutionPartenaires).toEqual({ 10: 'CPAM de Rouen', 20: 'DREETS Normandie' });
    });

    it('should not query institutions when institution_part has no numeric ids', async () => {
      const rowWithTextPart = { ...mockRow, institution_part: 'Autre institution' };
      vi.mocked(mariadbPool.query)
        .mockResolvedValueOnce([rowWithTextPart])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await fetchSirecData(42);

      expect(result?.institutionPartenaires).toEqual({});
      expect(mariadbPool.query).toHaveBeenCalledTimes(8);
    });

    it('should return null when the reclamation is not found', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([]);

      const result = await fetchSirecData(99);

      expect(result).toBeNull();
    });

    it('should not query motifs or groupIds when the reclamation is not found', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([]);

      await fetchSirecData(99);

      expect(mariadbPool.query).toHaveBeenCalledOnce();
    });
  });

  describe('fetchSirecIdsByServiceIds', () => {
    it('should return distinct id_data for the given service ids', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([{ id_data: 10 }, { id_data: 20 }, { id_data: 30 }]);

      const result = await fetchSirecIdsByServiceIds([5, 6]);

      expect(result).toEqual([10, 20, 30]);
      expect(mariadbPool.query).toHaveBeenCalledWith(expect.stringContaining('sire_reclamation_data r'), [[5, 6]]);
    });

    it('should return an empty array when no reclamations found', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([]);

      const result = await fetchSirecIdsByServiceIds([99]);

      expect(result).toEqual([]);
    });

    it('should return an empty array without querying when serviceIds is empty', async () => {
      const result = await fetchSirecIdsByServiceIds([]);

      expect(result).toEqual([]);
      expect(mariadbPool.query).not.toHaveBeenCalled();
    });

    it('should query with INNER JOIN on sire_reclamation_data', async () => {
      vi.mocked(mariadbPool.query).mockResolvedValueOnce([]);

      await fetchSirecIdsByServiceIds([1]);

      expect(mariadbPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INNER JOIN sire_reclamation_data_group'),
        expect.any(Array),
      );
    });
  });
});
