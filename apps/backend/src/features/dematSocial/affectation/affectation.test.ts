import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../../../generated/client';
import { assignEntitesToRequeteTask } from './affectation';
import type { EntiteAdminType } from './types';

vi.mock('./buildSituationContext', () => ({
  buildSituationContextFromDemat: vi.fn(),
}));

vi.mock('./decisionTree', () => ({
  runDecisionTree: vi.fn(),
}));

vi.mock('./geo/geoIndex', () => ({
  findGeoByPostalCode: vi.fn(),
}));

vi.mock('@/features/requeteEtapes/requetesEtapes.service', () => ({
  createDefaultRequeteEtapes: vi.fn(),
}));

vi.mock('@/libs/asyncLocalStorage', () => ({
  getLoggerStore: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock('../../../../generated/client', async () => {
  const actual = await vi.importActual('../../../../generated/client');
  return {
    ...actual,
    PrismaClient: class MockPrismaClient {
      constructor() {
        const instance = (globalThis as { __mockPrismaInstance__?: PrismaClient }).__mockPrismaInstance__;
        if (instance) {
          Object.assign(this, instance);
        }
      }
    },
  };
});

import { createDefaultRequeteEtapes } from '@/features/requeteEtapes/requetesEtapes.service';
import { buildSituationContextFromDemat } from './buildSituationContext';
import { runDecisionTree } from './decisionTree';
import { findGeoByPostalCode } from './geo/geoIndex';

describe('assignEntitesToRequeteTask', () => {
  let mockPrisma: PrismaClient;
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

    mockPrisma = {
      requete: {
        findFirst: vi.fn(),
      },
      entite: {
        findFirst: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(mockTransaction)),
      $disconnect: vi.fn(),
    } as unknown as PrismaClient;

    (globalThis as { __mockPrismaInstance__?: PrismaClient }).__mockPrismaInstance__ = mockPrisma;
  });

  it('should throw error when requete is not found by id', async () => {
    (mockPrisma.requete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(assignEntitesToRequeteTask('requete-1')).rejects.toThrow('Requete requete-1 not found');
  });

  it('should find requete by dematSocialId when provided as number string', async () => {
    const mockRequete = {
      id: 'requete-1',
      dematSocialId: 12345,
      receptionDate: new Date('2024-01-01'),
      situations: [],
    };

    (mockPrisma.requete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockRequete);

    await assignEntitesToRequeteTask('12345');

    expect(mockPrisma.requete.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ id: '12345' }, { dematSocialId: 12345 }],
      },
      include: expect.any(Object),
    });
  });

  it('should return early when no entities are found', async () => {
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

    (mockPrisma.requete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockRequete);
    (buildSituationContextFromDemat as ReturnType<typeof vi.fn>).mockReturnValue({
      postalCode: '75001',
    });
    (runDecisionTree as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (findGeoByPostalCode as ReturnType<typeof vi.fn>).mockReturnValue(null);

    await assignEntitesToRequeteTask('requete-1');

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('should skip situation when postal code is missing', async () => {
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

    (mockPrisma.requete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockRequete);
    (buildSituationContextFromDemat as ReturnType<typeof vi.fn>).mockReturnValue({
      postalCode: null,
    });
    (runDecisionTree as ReturnType<typeof vi.fn>).mockResolvedValue(['ARS']);

    await assignEntitesToRequeteTask('requete-1');

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('should skip situation when geolocation is not found', async () => {
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

    (mockPrisma.requete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockRequete);
    (buildSituationContextFromDemat as ReturnType<typeof vi.fn>).mockReturnValue({
      postalCode: '75001',
    });
    (runDecisionTree as ReturnType<typeof vi.fn>).mockResolvedValue(['ARS']);
    (findGeoByPostalCode as ReturnType<typeof vi.fn>).mockReturnValue(null);

    await assignEntitesToRequeteTask('requete-1');

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('should skip when entity is not found in database', async () => {
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

    (mockPrisma.requete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockRequete);
    (buildSituationContextFromDemat as ReturnType<typeof vi.fn>).mockReturnValue({
      postalCode: '75001',
    });
    (runDecisionTree as ReturnType<typeof vi.fn>).mockResolvedValue(['ARS']);
    (findGeoByPostalCode as ReturnType<typeof vi.fn>).mockReturnValue({
      departementCode: '75',
      ctcdCode: '75C',
      regionCode: '11',
    });
    (mockPrisma.entite.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await assignEntitesToRequeteTask('requete-1');

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
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

    (mockPrisma.requete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockRequete);
    (buildSituationContextFromDemat as ReturnType<typeof vi.fn>).mockReturnValue({
      postalCode: '75001',
    });
    (runDecisionTree as ReturnType<typeof vi.fn>).mockResolvedValue(['ARS'] as EntiteAdminType[]);
    (findGeoByPostalCode as ReturnType<typeof vi.fn>).mockReturnValue({
      departementCode: '75',
      ctcdCode: '75C',
      regionCode: '11',
    });
    (mockPrisma.entite.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockEntite);

    await assignEntitesToRequeteTask('requete-1');

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockTransaction.requeteEntite.upsert).toHaveBeenCalledWith({
      where: { requeteId_entiteId: { requeteId: 'requete-1', entiteId: 'entite-1' } },
      create: { requeteId: 'requete-1', entiteId: 'entite-1', statutId: REQUETE_STATUT_TYPES.EN_COURS },
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
        after: { entiteIds: ['entite-1'] },
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

    (mockPrisma.requete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockRequete);
    (buildSituationContextFromDemat as ReturnType<typeof vi.fn>).mockReturnValue({
      postalCode: '75001',
    });
    (runDecisionTree as ReturnType<typeof vi.fn>).mockResolvedValue(['CD', 'DD'] as EntiteAdminType[]);
    (findGeoByPostalCode as ReturnType<typeof vi.fn>).mockReturnValue({
      departementCode: '75',
      ctcdCode: '75C',
      regionCode: '11',
    });
    (mockPrisma.entite.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockEntiteCD)
      .mockResolvedValueOnce(mockEntiteDD);

    await assignEntitesToRequeteTask('requete-1');

    expect(mockTransaction.requeteEntite.upsert).toHaveBeenCalledTimes(2);
    expect(mockTransaction.situationEntite.upsert).toHaveBeenCalledTimes(2);
  });

  it('should handle errors in buildSituationContext or runDecisionTree gracefully', async () => {
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

    (mockPrisma.requete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockRequete);
    (buildSituationContextFromDemat as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Context build error');
    });

    await assignEntitesToRequeteTask('requete-1');

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
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

    (mockPrisma.requete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockRequete);
    (buildSituationContextFromDemat as ReturnType<typeof vi.fn>).mockReturnValue({
      postalCode: '75001',
    });
    (runDecisionTree as ReturnType<typeof vi.fn>).mockResolvedValue(['CD'] as EntiteAdminType[]);
    (findGeoByPostalCode as ReturnType<typeof vi.fn>).mockReturnValue({
      departementCode: '75',
      ctcdCode: '75C',
      regionCode: '11',
    });
    (mockPrisma.entite.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockEntite);

    await assignEntitesToRequeteTask('requete-1');

    expect(mockPrisma.entite.findFirst).toHaveBeenCalledWith({
      where: {
        entiteTypeId: 'CD',
        entiteMereId: null,
        ctcdCode: '75C',
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

    (mockPrisma.requete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockRequete);
    (buildSituationContextFromDemat as ReturnType<typeof vi.fn>).mockReturnValue({
      postalCode: '75001',
    });
    (runDecisionTree as ReturnType<typeof vi.fn>).mockResolvedValue(['ARS'] as EntiteAdminType[]);
    (findGeoByPostalCode as ReturnType<typeof vi.fn>).mockReturnValue({
      departementCode: '75',
      ctcdCode: '75C',
      regionCode: '11',
    });
    (mockPrisma.entite.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockEntite);

    await assignEntitesToRequeteTask('requete-1');

    expect(mockPrisma.entite.findFirst).toHaveBeenCalledWith({
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

    (mockPrisma.requete.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockRequete);
    (buildSituationContextFromDemat as ReturnType<typeof vi.fn>).mockReturnValue({
      postalCode: '75001',
    });
    (runDecisionTree as ReturnType<typeof vi.fn>).mockResolvedValue(['ARS'] as EntiteAdminType[]);
    (findGeoByPostalCode as ReturnType<typeof vi.fn>).mockReturnValue({
      departementCode: '75',
      ctcdCode: '75C',
      regionCode: '11',
    });
    (mockPrisma.entite.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockEntite);
    (mockTransaction.requeteEtape.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 'etape-1' }]);

    await assignEntitesToRequeteTask('requete-1');

    expect(createDefaultRequeteEtapes).not.toHaveBeenCalled();
  });
});
