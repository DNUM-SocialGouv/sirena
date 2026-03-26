import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../libs/__mocks__/prisma.js';
import { assignEntitesToRequeteTask } from './affectation.js';
import type { EntiteAdminType } from './types.js';

vi.mock('./buildSituationContext.js', () => ({
  buildSituationContext: vi.fn(),
}));

vi.mock('./decisionTree.js', () => ({
  runDecisionTree: vi.fn(),
}));

vi.mock('./geo/geoIndex.js', () => ({
  findGeoByPostalCode: vi.fn(),
}));

vi.mock('../../requeteEtapes/requetesEtapes.service.js', () => ({
  createDefaultRequeteEtapes: vi.fn(),
}));

vi.mock('../../../libs/asyncLocalStorage.js', () => ({
  getLoggerStore: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  })),
}));

vi.mock('../../entites/entite.notification.service.js', () => ({
  sendEntiteAssignedNotification: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../libs/prisma.js');

import { createDefaultRequeteEtapes } from '../../requeteEtapes/requetesEtapes.service.js';
import { buildSituationContext } from './buildSituationContext.js';
import { runDecisionTree } from './decisionTree.js';
import { findGeoByPostalCode } from './geo/geoIndex.js';

describe('assignEntitesToRequeteTask', () => {
  let mockTransaction: {
    requeteEntite: { upsert: ReturnType<typeof vi.fn> };
    situationEntite: { upsert: ReturnType<typeof vi.fn> };
    changeLog: { create: ReturnType<typeof vi.fn> };
    requeteEtape: { findMany: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockTransaction = {
      requeteEntite: {
        upsert: vi.fn(),
      },
      situationEntite: {
        upsert: vi.fn(),
      },
      changeLog: {
        create: vi.fn(),
      },
      requeteEtape: {
        findMany: vi.fn(() => Promise.resolve([])),
      },
    };

    vi.mocked(prisma.requete.findFirst).mockReset();
    vi.mocked(prisma.entite.findFirst).mockReset();
    vi.mocked(prisma.requeteEntite.findMany).mockReset();
    vi.mocked(prisma.$transaction).mockReset();
    vi.mocked(prisma.$disconnect).mockReset();

    vi.mocked(prisma.requeteEntite.findMany).mockResolvedValue([]);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(mockTransaction as never));
  });

  it('should throw error when requete is not found by id', async () => {
    vi.mocked(prisma.requete.findFirst).mockResolvedValue(null);

    await expect(assignEntitesToRequeteTask('requete-1')).rejects.toThrow('Requete requete-1 not found');
  });

  it('should find requete by dematSocialId when provided as number string', async () => {
    const mockRequete = {
      id: 'requete-1',
      dematSocialId: 12345,
      receptionDate: new Date('2024-01-01'),
      situations: [],
    };

    const mockArsNormandie = {
      id: 'ars-normandie-1',
      nomComplet: 'ARS Normandie',
    };

    vi.mocked(prisma.requete.findFirst).mockResolvedValue(mockRequete as never);
    vi.mocked(prisma.entite.findFirst).mockResolvedValue(mockArsNormandie as never);

    await assignEntitesToRequeteTask('12345');

    expect(prisma.requete.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ id: '12345' }, { dematSocialId: 12345 }],
      },
      include: expect.any(Object),
    });
    expect(prisma.entite.findFirst).toHaveBeenCalledWith({
      where: {
        entiteTypeId: 'ARS',
        entiteMereId: null,
        regionCode: '28',
      },
    });
  });

  it('should fallback to regional ARS when no entities are assigned but region is deducible', async () => {
    const mockRequete = {
      id: 'requete-1',
      receptionDate: new Date('2024-01-01'),
      situations: [
        {
          id: 'situation-1',
          lieuDeSurvenue: { codePostal: '75001', adresse: null },
          misEnCause: {},
          faits: [],
        },
        {
          id: 'situation-2',
          lieuDeSurvenue: { codePostal: '75002', adresse: null },
          misEnCause: {},
          faits: [],
        },
      ],
    };

    const mockArsIdf = {
      id: 'ars-idf-1',
      nomComplet: 'ARS Île-de-France',
    };

    (buildSituationContext as ReturnType<typeof vi.fn>).mockReturnValue({ postalCode: '75001' });
    (runDecisionTree as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (findGeoByPostalCode as ReturnType<typeof vi.fn>).mockReturnValue({
      departementCode: '75',
      ctcdCode: '75C',
      regionCode: '11',
    });
    vi.mocked(prisma.requete.findFirst).mockResolvedValue(mockRequete as never);
    vi.mocked(prisma.entite.findFirst).mockResolvedValue(mockArsIdf as never);

    await assignEntitesToRequeteTask('requete-1');

    expect(prisma.entite.findFirst).toHaveBeenCalledWith({
      where: { entiteTypeId: 'ARS', entiteMereId: null, regionCode: '11' },
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(mockTransaction.requeteEntite.upsert).toHaveBeenCalledWith({
      where: { requeteId_entiteId: { requeteId: 'requete-1', entiteId: 'ars-idf-1' } },
      create: { requeteId: 'requete-1', entiteId: 'ars-idf-1', statutId: REQUETE_STATUT_TYPES.NOUVEAU },
      update: {},
    });

    expect(mockTransaction.situationEntite.upsert).toHaveBeenCalledTimes(2);
    expect(mockTransaction.situationEntite.upsert).toHaveBeenCalledWith({
      where: { situationId_entiteId: { situationId: 'situation-1', entiteId: 'ars-idf-1' } },
      create: { situationId: 'situation-1', entiteId: 'ars-idf-1' },
      update: {},
    });
    expect(mockTransaction.situationEntite.upsert).toHaveBeenCalledWith({
      where: { situationId_entiteId: { situationId: 'situation-2', entiteId: 'ars-idf-1' } },
      create: { situationId: 'situation-2', entiteId: 'ars-idf-1' },
      update: {},
    });

    expect(mockTransaction.changeLog.create).toHaveBeenCalledWith({
      data: {
        entity: 'Requete',
        entityId: 'requete-1',
        action: 'AFFECTATION_ENTITES',
        before: undefined,
        after: { entiteIds: ['ars-idf-1'], isFallback: true },
        changedById: null,
      },
    });
    expect(createDefaultRequeteEtapes).toHaveBeenCalled();
  });

  it('should fallback to ARS Normandie when no entities are assigned and region is not deducible', async () => {
    const mockRequete = {
      id: 'requete-1',
      receptionDate: new Date('2024-01-01'),
      situations: [
        {
          id: 'situation-1',
          lieuDeSurvenue: { codePostal: '75001', adresse: null },
          misEnCause: {},
          faits: [],
        },
      ],
    };

    const mockArsNormandie = {
      id: 'ars-normandie-1',
      nomComplet: 'ARS Normandie',
    };

    vi.mocked(prisma.requete.findFirst).mockResolvedValue(mockRequete as never);
    (buildSituationContext as ReturnType<typeof vi.fn>).mockReturnValue({ postalCode: '75001' });
    (runDecisionTree as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (findGeoByPostalCode as ReturnType<typeof vi.fn>).mockReturnValue(null);
    vi.mocked(prisma.entite.findFirst).mockResolvedValue(mockArsNormandie as never);

    await assignEntitesToRequeteTask('requete-1');

    expect(prisma.entite.findFirst).toHaveBeenCalledWith({
      where: { entiteTypeId: 'ARS', entiteMereId: null, regionCode: '28' },
    });

    expect(mockTransaction.requeteEntite.upsert).toHaveBeenCalledWith({
      where: { requeteId_entiteId: { requeteId: 'requete-1', entiteId: 'ars-normandie-1' } },
      create: { requeteId: 'requete-1', entiteId: 'ars-normandie-1', statutId: REQUETE_STATUT_TYPES.NOUVEAU },
      update: {},
    });
  });

  it('should throw error when ARS Normandie is not found in database during fallback', async () => {
    const mockRequete = {
      id: 'requete-1',
      receptionDate: new Date('2024-01-01'),
      situations: [
        {
          id: 'situation-1',
          lieuDeSurvenue: {
            adresse: { codePostal: '75001' },
          },
          misEnCause: {},
          faits: [],
        },
      ],
    };

    vi.mocked(prisma.requete.findFirst).mockResolvedValue(mockRequete as never);
    (buildSituationContext as ReturnType<typeof vi.fn>).mockReturnValue({
      postalCode: '75001',
    });
    (runDecisionTree as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (findGeoByPostalCode as ReturnType<typeof vi.fn>).mockReturnValue(null);
    vi.mocked(prisma.entite.findFirst).mockResolvedValue(null);

    await expect(assignEntitesToRequeteTask('requete-1')).rejects.toThrow('ARS Normandie not found in database');

    expect(prisma.entite.findFirst).toHaveBeenCalledWith({
      where: {
        entiteTypeId: 'ARS',
        entiteMereId: null,
        regionCode: '28',
      },
    });

    expect(prisma.$disconnect).toHaveBeenCalled();

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('should fallback to ARS Normandie when buildSituationContext throws and situation has no postal code', async () => {
    const mockRequete = {
      id: 'requete-1',
      receptionDate: new Date('2024-01-01'),
      situations: [
        {
          id: 'situation-1',
          lieuDeSurvenue: { codePostal: null, adresse: null },
          misEnCause: {},
          faits: [],
        },
      ],
    };

    const mockArsNormandie = {
      id: 'ars-normandie-1',
      nomComplet: 'ARS Normandie',
    };

    vi.mocked(prisma.requete.findFirst).mockResolvedValue(mockRequete as never);
    (buildSituationContext as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Unexpected error during assignment');
    });
    vi.mocked(prisma.entite.findFirst).mockResolvedValue(mockArsNormandie as never);

    await assignEntitesToRequeteTask('requete-1');

    expect(prisma.entite.findFirst).toHaveBeenCalledWith({
      where: { entiteTypeId: 'ARS', entiteMereId: null, regionCode: '28' },
    });
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(mockTransaction.requeteEntite.upsert).toHaveBeenCalledWith({
      where: { requeteId_entiteId: { requeteId: 'requete-1', entiteId: 'ars-normandie-1' } },
      create: { requeteId: 'requete-1', entiteId: 'ars-normandie-1', statutId: REQUETE_STATUT_TYPES.NOUVEAU },
      update: {},
    });
  });

  it('should fallback to regional ARS when buildSituationContext throws but situation has a postal code', async () => {
    const mockRequete = {
      id: 'requete-1',
      receptionDate: new Date('2024-01-01'),
      situations: [
        {
          id: 'situation-1',
          lieuDeSurvenue: { codePostal: '75001', adresse: null },
          misEnCause: {},
          faits: [],
        },
      ],
    };

    const mockArsIdf = {
      id: 'ars-idf-1',
      nomComplet: 'ARS Île-de-France',
    };

    vi.mocked(prisma.requete.findFirst).mockResolvedValue(mockRequete as never);
    (buildSituationContext as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Unexpected error during assignment');
    });
    (findGeoByPostalCode as ReturnType<typeof vi.fn>).mockReturnValue({
      departementCode: '75',
      ctcdCode: '75C',
      regionCode: '11',
    });
    vi.mocked(prisma.entite.findFirst).mockResolvedValue(mockArsIdf as never);

    await assignEntitesToRequeteTask('requete-1');

    expect(prisma.entite.findFirst).toHaveBeenCalledWith({
      where: { entiteTypeId: 'ARS', entiteMereId: null, regionCode: '11' },
    });
    expect(mockTransaction.requeteEntite.upsert).toHaveBeenCalledWith({
      where: { requeteId_entiteId: { requeteId: 'requete-1', entiteId: 'ars-idf-1' } },
      create: { requeteId: 'requete-1', entiteId: 'ars-idf-1', statutId: REQUETE_STATUT_TYPES.NOUVEAU },
      update: {},
    });
  });

  it('should fallback to ARS Normandie when postal code is missing (region not deducible)', async () => {
    const mockRequete = {
      id: 'requete-1',
      receptionDate: new Date('2024-01-01'),
      situations: [
        {
          id: 'situation-1',
          lieuDeSurvenue: { codePostal: null, adresse: null },
          misEnCause: {},
          faits: [],
        },
      ],
    };

    const mockArsNormandie = {
      id: 'ars-normandie-1',
      nomComplet: 'ARS Normandie',
    };

    vi.mocked(prisma.requete.findFirst).mockResolvedValue(mockRequete as never);
    (buildSituationContext as ReturnType<typeof vi.fn>).mockReturnValue({ postalCode: null });
    (runDecisionTree as ReturnType<typeof vi.fn>).mockResolvedValue(['ARS']);
    vi.mocked(prisma.entite.findFirst).mockResolvedValue(mockArsNormandie as never);

    await assignEntitesToRequeteTask('requete-1');

    expect(prisma.entite.findFirst).toHaveBeenCalledWith({
      where: { entiteTypeId: 'ARS', entiteMereId: null, regionCode: '28' },
    });
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(mockTransaction.requeteEntite.upsert).toHaveBeenCalledWith({
      where: { requeteId_entiteId: { requeteId: 'requete-1', entiteId: 'ars-normandie-1' } },
      create: { requeteId: 'requete-1', entiteId: 'ars-normandie-1', statutId: REQUETE_STATUT_TYPES.NOUVEAU },
      update: {},
    });
  });

  it('should fallback to ARS Normandie when geolocation not found (region not deducible)', async () => {
    const mockRequete = {
      id: 'requete-1',
      receptionDate: new Date('2024-01-01'),
      situations: [
        {
          id: 'situation-1',
          lieuDeSurvenue: { codePostal: '75001', adresse: null },
          misEnCause: {},
          faits: [],
        },
      ],
    };

    const mockArsNormandie = {
      id: 'ars-normandie-1',
      nomComplet: 'ARS Normandie',
    };

    vi.mocked(prisma.requete.findFirst).mockResolvedValue(mockRequete as never);
    (buildSituationContext as ReturnType<typeof vi.fn>).mockReturnValue({ postalCode: '75001' });
    (runDecisionTree as ReturnType<typeof vi.fn>).mockResolvedValue(['ARS']);
    (findGeoByPostalCode as ReturnType<typeof vi.fn>).mockReturnValue(null);
    vi.mocked(prisma.entite.findFirst).mockResolvedValue(mockArsNormandie as never);

    await assignEntitesToRequeteTask('requete-1');

    expect(prisma.entite.findFirst).toHaveBeenCalledWith({
      where: { entiteTypeId: 'ARS', entiteMereId: null, regionCode: '28' },
    });
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(mockTransaction.requeteEntite.upsert).toHaveBeenCalledWith({
      where: { requeteId_entiteId: { requeteId: 'requete-1', entiteId: 'ars-normandie-1' } },
      create: { requeteId: 'requete-1', entiteId: 'ars-normandie-1', statutId: REQUETE_STATUT_TYPES.NOUVEAU },
      update: {},
    });
  });

  it('should fallback to regional ARS when entity not found in main loop but region is deducible', async () => {
    const mockRequete = {
      id: 'requete-1',
      receptionDate: new Date('2024-01-01'),
      situations: [
        {
          id: 'situation-1',
          lieuDeSurvenue: { codePostal: '75001', adresse: null },
          misEnCause: {},
          faits: [],
        },
      ],
    };

    const mockArsIdf = {
      id: 'ars-idf-1',
      nomComplet: 'ARS Île-de-France',
    };

    vi.mocked(prisma.requete.findFirst).mockResolvedValue(mockRequete as never);
    (buildSituationContext as ReturnType<typeof vi.fn>).mockReturnValue({ postalCode: '75001' });
    (runDecisionTree as ReturnType<typeof vi.fn>).mockResolvedValue(['ARS']);
    (findGeoByPostalCode as ReturnType<typeof vi.fn>).mockReturnValue({
      departementCode: '75',
      ctcdCode: '75C',
      regionCode: '11',
    });
    // 1st call: main loop ARS lookup → not found; 2nd call: fallback ARS lookup → found
    vi.mocked(prisma.entite.findFirst).mockResolvedValueOnce(null).mockResolvedValueOnce(mockArsIdf);

    await assignEntitesToRequeteTask('requete-1');

    expect(prisma.entite.findFirst).toHaveBeenCalledWith({
      where: { entiteTypeId: 'ARS', entiteMereId: null, regionCode: '11' },
    });
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(mockTransaction.requeteEntite.upsert).toHaveBeenCalledWith({
      where: { requeteId_entiteId: { requeteId: 'requete-1', entiteId: 'ars-idf-1' } },
      create: { requeteId: 'requete-1', entiteId: 'ars-idf-1', statutId: REQUETE_STATUT_TYPES.NOUVEAU },
      update: {},
    });
  });

  it('should successfully assign entities and create links', async () => {
    const mockRequete = {
      id: 'requete-1',
      receptionDate: new Date('2024-01-01'),
      situations: [
        {
          id: 'situation-1',
          lieuDeSurvenue: {
            adresse: { codePostal: '75001' },
          },
          misEnCause: {},
          faits: [],
        },
      ],
    };

    const mockEntite = {
      id: 'entite-1',
      nomComplet: 'ARS - Île-de-France',
    };

    vi.mocked(prisma.requete.findFirst).mockResolvedValue(mockRequete as never);
    (buildSituationContext as ReturnType<typeof vi.fn>).mockReturnValue({
      postalCode: '75001',
    });
    (runDecisionTree as ReturnType<typeof vi.fn>).mockResolvedValue(['ARS'] as EntiteAdminType[]);
    (findGeoByPostalCode as ReturnType<typeof vi.fn>).mockReturnValue({
      departementCode: '75',
      ctcdCode: '75C',
      regionCode: '11',
    });
    vi.mocked(prisma.entite.findFirst).mockResolvedValue(mockEntite as never);

    await assignEntitesToRequeteTask('requete-1');

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(mockTransaction.requeteEntite.upsert).toHaveBeenCalledWith({
      where: { requeteId_entiteId: { requeteId: 'requete-1', entiteId: 'entite-1' } },
      create: { requeteId: 'requete-1', entiteId: 'entite-1', statutId: REQUETE_STATUT_TYPES.NOUVEAU },
      update: {},
    });
    expect(mockTransaction.situationEntite.upsert).toHaveBeenCalledWith({
      where: { situationId_entiteId: { situationId: 'situation-1', entiteId: 'entite-1' } },
      create: { situationId: 'situation-1', entiteId: 'entite-1' },
      update: {},
    });
    expect(mockTransaction.changeLog.create).toHaveBeenCalledWith({
      data: {
        entity: 'Requete',
        entityId: 'requete-1',
        action: 'AFFECTATION_ENTITES',
        before: undefined,
        after: { entiteIds: ['entite-1'], isFallback: false },
        changedById: null,
      },
    });
    expect(createDefaultRequeteEtapes).toHaveBeenCalled();
  });

  it('should handle multiple entity types (CD and DD)', async () => {
    const mockRequete = {
      id: 'requete-1',
      receptionDate: new Date('2024-01-01'),
      situations: [
        {
          id: 'situation-1',
          lieuDeSurvenue: {
            adresse: { codePostal: '75001' },
          },
          misEnCause: {},
          faits: [],
        },
      ],
    };

    const mockEntiteCD = {
      id: 'entite-cd-1',
      nomComplet: 'CD - Paris',
    };

    const mockEntiteDD = {
      id: 'entite-dd-1',
      nomComplet: 'DDETS - Paris',
    };

    vi.mocked(prisma.requete.findFirst).mockResolvedValue(mockRequete as never);
    (buildSituationContext as ReturnType<typeof vi.fn>).mockReturnValue({
      postalCode: '75001',
    });
    (runDecisionTree as ReturnType<typeof vi.fn>).mockResolvedValue(['CD', 'DD'] as EntiteAdminType[]);
    (findGeoByPostalCode as ReturnType<typeof vi.fn>).mockReturnValue({
      departementCode: '75',
      ctcdCode: '75C',
      regionCode: '11',
    });
    vi.mocked(prisma.entite.findFirst).mockResolvedValueOnce(mockEntiteCD).mockResolvedValueOnce(mockEntiteDD);

    await assignEntitesToRequeteTask('requete-1');

    expect(mockTransaction.requeteEntite.upsert).toHaveBeenCalledTimes(2);
    expect(mockTransaction.situationEntite.upsert).toHaveBeenCalledTimes(2);
  });

  it('should use ctcdCode AND departementCode for CD and DD entity types', async () => {
    const mockRequete = {
      id: 'requete-1',
      receptionDate: new Date('2024-01-01'),
      situations: [
        {
          id: 'situation-1',
          lieuDeSurvenue: {
            adresse: { codePostal: '75001' },
          },
          misEnCause: {},
          faits: [],
        },
      ],
    };

    const mockEntite = {
      id: 'entite-cd-1',
      nomComplet: 'CD - Paris',
    };

    vi.mocked(prisma.requete.findFirst).mockResolvedValue(mockRequete as never);
    (buildSituationContext as ReturnType<typeof vi.fn>).mockReturnValue({
      postalCode: '75001',
    });
    (runDecisionTree as ReturnType<typeof vi.fn>).mockResolvedValue(['CD'] as EntiteAdminType[]);
    (findGeoByPostalCode as ReturnType<typeof vi.fn>).mockReturnValue({
      departementCode: '75',
      ctcdCode: '75C',
      regionCode: '11',
    });
    vi.mocked(prisma.entite.findFirst).mockResolvedValue(mockEntite as never);

    await assignEntitesToRequeteTask('requete-1');

    expect(prisma.entite.findFirst).toHaveBeenCalledWith({
      where: {
        entiteTypeId: 'CD',
        entiteMereId: null,
        ctcdCode: { in: ['75C', '75CD'] },
        departementCode: '75',
      },
    });
  });

  it('should use regionCode for ARS entity type', async () => {
    const mockRequete = {
      id: 'requete-1',
      receptionDate: new Date('2024-01-01'),
      situations: [
        {
          id: 'situation-1',
          lieuDeSurvenue: {
            adresse: { codePostal: '75001' },
          },
          misEnCause: {},
          faits: [],
        },
      ],
    };

    const mockEntite = {
      id: 'entite-ars-1',
      nomComplet: 'ARS - Île-de-France',
    };

    vi.mocked(prisma.requete.findFirst).mockResolvedValue(mockRequete as never);
    (buildSituationContext as ReturnType<typeof vi.fn>).mockReturnValue({
      postalCode: '75001',
    });
    (runDecisionTree as ReturnType<typeof vi.fn>).mockResolvedValue(['ARS'] as EntiteAdminType[]);
    (findGeoByPostalCode as ReturnType<typeof vi.fn>).mockReturnValue({
      departementCode: '75',
      ctcdCode: '75C',
      regionCode: '11',
    });
    vi.mocked(prisma.entite.findFirst).mockResolvedValue(mockEntite as never);

    await assignEntitesToRequeteTask('requete-1');

    expect(prisma.entite.findFirst).toHaveBeenCalledWith({
      where: {
        entiteTypeId: 'ARS',
        entiteMereId: null,
        regionCode: '11',
      },
    });
  });

  it('should not create default steps if they already exist', async () => {
    const mockRequete = {
      id: 'requete-1',
      receptionDate: new Date('2024-01-01'),
      situations: [
        {
          id: 'situation-1',
          lieuDeSurvenue: {
            adresse: { codePostal: '75001' },
          },
          misEnCause: {},
          faits: [],
        },
      ],
    };

    const mockEntite = {
      id: 'entite-1',
      nomComplet: 'ARS - Île-de-France',
    };

    vi.mocked(prisma.requete.findFirst).mockResolvedValue(mockRequete as never);
    (buildSituationContext as ReturnType<typeof vi.fn>).mockReturnValue({
      postalCode: '75001',
    });
    (runDecisionTree as ReturnType<typeof vi.fn>).mockResolvedValue(['ARS'] as EntiteAdminType[]);
    (findGeoByPostalCode as ReturnType<typeof vi.fn>).mockReturnValue({
      departementCode: '75',
      ctcdCode: '75C',
      regionCode: '11',
    });
    vi.mocked(prisma.entite.findFirst).mockResolvedValue(mockEntite as never);
    (mockTransaction.requeteEtape.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 'etape-1' }]);

    await assignEntitesToRequeteTask('requete-1');

    expect(createDefaultRequeteEtapes).not.toHaveBeenCalled();
  });
});
