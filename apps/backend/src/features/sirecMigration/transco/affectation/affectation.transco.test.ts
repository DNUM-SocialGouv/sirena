import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SirecTranscoError } from '../sirecTransco.error.js';
import { filterArsEntiteIds, initAffectationTransco, transcodeAffectation } from './affectation.transco.js';

vi.mock('@sirena/db', () => ({
  prisma: {
    entite: { findMany: vi.fn() },
  },
}));

const ARS_NORMANDIE_ID = 'ars-normandie-dynamic-id';
const ARS_AUVERGNE_ID = 'ars-auvergne-id';
const ARS_GRAND_EST_ID = 'ars-grand-est-id';
const ARS_PACA_ID = 'ars-paca-id';

const makeArs = (id: string, nomComplet: string) => ({ id, nomComplet, entiteMere: null });

const makeEntity = (
  id: string,
  nomComplet: string,
  parentNomComplet: string,
  parentId = 'parent-id',
  grandParentNomComplet?: string,
) => ({
  id,
  nomComplet,
  entiteMere: {
    id: parentId,
    nomComplet: parentNomComplet,
    entiteMere: grandParentNomComplet ? { id: 'grand-parent-id', nomComplet: grandParentNomComplet } : null,
  },
});

async function setupTransco(entities: object[]) {
  const { prisma } = await import('@sirena/db');
  vi.mocked(prisma.entite.findMany).mockResolvedValueOnce(entities as never);
  await initAffectationTransco();
}

function makeAllRequiredEntities() {
  const dosId = 'dos-id';
  const damtnId = 'damtn-id';
  const dspId = 'dsp-id';

  const childOfArs = (id: string, label: string) => makeEntity(id, label, 'ARS Normandie', ARS_NORMANDIE_ID);
  const childOfDos = (id: string, label: string) =>
    makeEntity(id, label, "Direction de l'Offre de Soin", dosId, 'ARS Normandie');
  const childOfDamtn = (id: string, label: string) => makeEntity(id, label, 'DAMTN', damtnId, 'ARS Normandie');
  const childOfDsp = (id: string, label: string) =>
    makeEntity(id, label, 'Direction de la Santé Publique', dspId, 'ARS Normandie');

  return [
    // ARS entities
    makeArs(ARS_NORMANDIE_ID, 'ARS Normandie'),
    makeArs(ARS_AUVERGNE_ID, 'ARS Auvergne-Rhône-Alpes'),
    makeArs('ars-bfc-id', 'ARS Bourgogne-Franche-Comté'),
    makeArs('ars-bretagne-id', 'ARS Bretagne'),
    makeArs('ars-cvl-id', 'ARS Centre-Val de Loire'),
    makeArs('ars-corse-id', 'ARS Corse'),
    makeArs(ARS_GRAND_EST_ID, 'ARS Grand Est'),
    makeArs('ars-guadeloupe-id', 'ARS Guadeloupe'),
    makeArs('ars-guyane-id', 'ARS Guyane'),
    makeArs('ars-hautsdefrance-id', 'ARS Hauts-de-France'),
    makeArs('ars-ile-de-france-id', 'ARS Île-de-France'),
    makeArs('ars-reunion-id', 'ARS La Réunion'),
    makeArs('ars-martinique-id', 'ARS Martinique'),
    makeArs('ars-mayotte-id', 'ARS Mayotte'),
    makeArs('ars-nouvelle-aquitaine-id', 'ARS Nouvelle-Aquitaine'),
    makeArs('ars-occitanie-id', 'ARS Occitanie'),
    makeArs('ars-pays-de-la-loire-id', 'ARS Pays de la Loire'),
    makeArs(ARS_PACA_ID, "ARS Provence-Alpes-Côte d'Azur"),
    // Service entities (ARS Normandie)
    childOfArs(dosId, "Direction de l'Offre de Soin"),
    childOfArs(damtnId, 'DAMTN'),
    childOfArs('dau-id', "Direction de l'Autonomie"),
    childOfArs('mic-id', 'Mission Inspection-Controle (MIC)'),
    childOfArs('paj-id', 'PAJ'),
    childOfArs(dspId, 'Direction de la Santé Publique'),
    childOfDos('poa-id', 'Pôle Offre Ambulatoire (POA)'),
    childOfDos('psp27-76-id', 'Pôle soins et sûreté des personnes 27-76'),
    childOfDos('psp14-50-61-id', 'Pôle soins et sûreté des personnes 14-50-61'),
    childOfDos('ts14-id', 'Transports sanitaires 14'),
    childOfDos('ts27-id', 'Transports sanitaires 27'),
    childOfDos('ts50-id', 'Transports sanitaires 50'),
    childOfDos('ts61-id', 'Transports sanitaires 61'),
    childOfDos('ts76-id', 'Transports sanitaires 76'),
    childOfDamtn('pnm-id', 'Professions Non Médicales (PNM)'),
    childOfDamtn('pm-id', 'Professions Médicales (PM)'),
    childOfDsp('se14-id', 'Santé Environnement (SE) DD 14'),
    childOfDsp('se27-id', 'Santé Environnement (SE) DD 27'),
    childOfDsp('se50-id', 'Santé Environnement (SE) DD 50'),
    childOfDsp('se61-id', 'Santé Environnement (SE) DD 61'),
    childOfDsp('se76-id', 'Santé Environnement (SE) DD 76'),
    makeArs('ddets-seine-id', 'DDETS de la Seine-Maritime'),
    makeArs('cd-calvados-id', 'Conseil départemental du Calvados'),
    makeArs('cd-eure-id', "Conseil départemental de L'Eure"),
    makeArs('cd-manche-id', 'Conseil départemental de la Manche'),
    makeArs('cd-orne-id', "Conseil départemental de L'Orne"),
    makeEntity('das-seine-id', 'Direction Autonomie Santé', 'DDETS de la Seine-Maritime', 'ddets-seine-id'),
    makeEntity('das-calvados-id', 'Direction Autonomie Santé', 'Conseil départemental du Calvados', 'cd-calvados-id'),
    makeEntity('das-eure-id', 'Direction Autonomie Santé', "Conseil départemental de L'Eure", 'cd-eure-id'),
    makeEntity(
      'mda-manche-id',
      "Maison Départementale de l'autonomie",
      'Conseil départemental de la Manche',
      'cd-manche-id',
    ),
    makeEntity(
      'mda-orne-id',
      "MDA (Maison Départementale de l'Autonomie)",
      "Conseil départemental de L'Orne",
      'cd-orne-id',
    ),
  ];
}

describe('affectation.transco.ts', () => {
  describe('ARS ids — require initAffectationTransco()', () => {
    beforeEach(async () => {
      await setupTransco(makeAllRequiredEntities());
    });

    it('should return the ARS entiteId in both requeteEntiteIds and situationEntiteIds', () => {
      const result = transcodeAffectation(693);

      expect(result).toEqual({
        requeteEntiteIds: [ARS_NORMANDIE_ID],
        situationEntiteIds: [ARS_NORMANDIE_ID],
      });
    });

    it('should map each ARS id to its SIRENA entiteId', () => {
      expect(transcodeAffectation(667).requeteEntiteIds).toEqual([ARS_AUVERGNE_ID]);
      expect(transcodeAffectation(677).requeteEntiteIds).toEqual([ARS_GRAND_EST_ID]);
      expect(transcodeAffectation(701).requeteEntiteIds).toEqual([ARS_PACA_ID]);
    });
  });

  describe('service ids (ARS Normandie) — require initAffectationTransco()', () => {
    beforeEach(async () => {
      await setupTransco(makeAllRequiredEntities());
    });

    it('should return ARS Normandie in requeteEntiteIds', () => {
      const result = transcodeAffectation(1115);

      expect(result.requeteEntiteIds).toEqual([ARS_NORMANDIE_ID]);
    });

    it('should include the service entity and ARS Normandie in situationEntiteIds', () => {
      const result = transcodeAffectation(1115);

      expect(result.situationEntiteIds).toContain('dau-id');
      expect(result.situationEntiteIds).toContain(ARS_NORMANDIE_ID);
    });

    it('should include multiple service entities when one SIREC id maps to several', () => {
      const result = transcodeAffectation(1093);

      expect(result.situationEntiteIds).toContain('pnm-id');
      expect(result.situationEntiteIds).toContain('pm-id');
      expect(result.requeteEntiteIds).toEqual([ARS_NORMANDIE_ID]);
    });

    it('should use the top-level entity (not ARS) in requeteEntiteIds when service parent is non-ARS', () => {
      const result = transcodeAffectation(1119);

      expect(result.situationEntiteIds).toContain('das-calvados-id');
      expect(result.requeteEntiteIds).toEqual(['cd-calvados-id']);
    });

    it('should find entity by three-level hierarchy (label + parent + grandparent)', () => {
      const result = transcodeAffectation(1091);

      expect(result.situationEntiteIds).toContain('poa-id');
      expect(result.requeteEntiteIds).toEqual([ARS_NORMANDIE_ID]);
    });

    it('should resolve to the same entity id for two SIREC ids that map to the same entity', () => {
      expect(transcodeAffectation(1087).situationEntiteIds).toContain('mic-id');
      expect(transcodeAffectation(1113).situationEntiteIds).toContain('mic-id');
    });

    it('should map five transports sanitaires for SIREC id 1099', () => {
      const result = transcodeAffectation(1099);

      expect(result.situationEntiteIds).toContain('ts14-id');
      expect(result.situationEntiteIds).toContain('ts27-id');
      expect(result.situationEntiteIds).toContain('ts50-id');
      expect(result.situationEntiteIds).toContain('ts61-id');
      expect(result.situationEntiteIds).toContain('ts76-id');
    });

    describe('initialization error cases', () => {
      it('should throw when initAffectationTransco has not been called', async () => {
        await vi.resetModules();
        const { transcodeAffectation: freshTranscode } = await import('./affectation.transco.js');

        expect(() => freshTranscode(693)).toThrow('initAffectationTransco()');
        expect(() => freshTranscode(1115)).toThrow('initAffectationTransco()');
      });

      it('should throw when a required service entity is missing from the Entite table', async () => {
        const entitiesWithoutDau = makeAllRequiredEntities().filter((e) => e.id !== 'dau-id');
        const { prisma } = await import('@sirena/db');
        vi.mocked(prisma.entite.findMany).mockResolvedValueOnce(entitiesWithoutDau as never);

        await expect(initAffectationTransco()).rejects.toThrow("Direction de l'Autonomie");
      });

      it('should throw when a required ARS entity is missing from the Entite table', async () => {
        const entitiesWithoutArsNormandie = makeAllRequiredEntities().filter((e) => e.nomComplet !== 'ARS Normandie');
        const { prisma } = await import('@sirena/db');
        vi.mocked(prisma.entite.findMany).mockResolvedValueOnce(entitiesWithoutArsNormandie as never);

        await expect(initAffectationTransco()).rejects.toThrow('ARS Normandie');
      });
    });
  });

  describe('filterArsEntiteIds', () => {
    beforeEach(async () => {
      await setupTransco(makeAllRequiredEntities());
    });

    it('should recognise the dynamically resolved ARS Normandie id', () => {
      const result = filterArsEntiteIds([ARS_NORMANDIE_ID]);

      expect(result).toContain(ARS_NORMANDIE_ID);
    });

    it('should exclude non-ARS entity ids', () => {
      const result = filterArsEntiteIds([ARS_NORMANDIE_ID, 'dau-id', 'unknown-id']);

      expect(result).toEqual([ARS_NORMANDIE_ID]);
    });

    it('should recognise multiple dynamically resolved ARS ids', () => {
      const result = filterArsEntiteIds([ARS_NORMANDIE_ID, ARS_GRAND_EST_ID]);

      expect(result).toContain(ARS_NORMANDIE_ID);
      expect(result).toContain(ARS_GRAND_EST_ID);
      expect(result).toHaveLength(2);
    });

    it('should recognise non-ARS top-level entities from service specs', () => {
      const result = filterArsEntiteIds(['cd-calvados-id', 'dau-id']);

      expect(result).toEqual(['cd-calvados-id']);
    });

    it('should return an empty array when no ARS entiteId is present', () => {
      const result = filterArsEntiteIds(['dau-id', 'poa-id']);

      expect(result).toEqual([]);
    });
  });

  describe('unknown ids', () => {
    beforeEach(async () => {
      await setupTransco(makeAllRequiredEntities());
    });

    it('should throw SirecTranscoError for an unknown id after init', () => {
      expect(() => transcodeAffectation(9999)).toThrow(SirecTranscoError);
    });

    it('should include the unknown id and table name in the error', () => {
      try {
        transcodeAffectation(9999);
      } catch (err) {
        expect(err).toBeInstanceOf(SirecTranscoError);
        expect((err as SirecTranscoError).idDico).toBe(9999);
        expect((err as SirecTranscoError).tableName).toBe('affectation');
      }
    });
  });
});
