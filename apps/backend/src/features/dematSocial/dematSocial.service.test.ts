import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DossierState } from '../../graphql/graphql.js';
import { graffle } from '../../libs/graffle.js';
import { createRequeteFromDematSocial, getRequeteByDematSocialId } from '../requetes/requetes.service.js';
import {
  acceptDossierWithoutNotification,
  getRequetes,
  importRequetes,
  importSingleDossier,
  updateInstruction,
} from './dematSocial.service.js';
import { createImportFailure, markFailureAsResolved } from './dematSocialImportFailure.service.js';

const sendMock = vi.fn();

vi.mock('../../libs/graffle.js', () => {
  const gqlMock = vi.fn(() => ({ send: sendMock }));
  const transportMock = vi.fn(() => ({ gql: gqlMock }));

  return {
    graffle: {
      transport: transportMock,
      gql: gqlMock,
    },
    GetDossiersByDateDocument: {},
    GetDossiersMetadataDocument: {},
    GetDossierDocument: {},
    ChangerInstructionDocument: {},
    AccepterDossierDocument: {},
  };
});

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    requete: {
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('../../config/env.js', () => ({
  envVars: {
    DEMAT_SOCIAL_API_DIRECTORY: 9999,
    DEMAT_SOCIAL_INSTRUCTEUR_ID: 'Instructeur-123',
  },
}));

vi.mock('../../libs/asyncLocalStorage.js', () => {
  const info = vi.fn();
  const error = vi.fn();
  const warn = vi.fn();
  const debug = vi.fn();
  const captureException = vi.fn();
  const setTag = vi.fn();
  const setContext = vi.fn();

  return {
    getLoggerStore: vi.fn(() => ({ info, error, warn, debug })),

    getSentryStore: vi.fn(() => ({ captureException, setTag, setContext })),

    abortControllerStorage: {
      getStore: vi.fn(() => new AbortController()),
    },
  };
});

vi.mock('../../features/requetes/requetes.service.js', () => ({
  getRequeteByDematSocialId: vi.fn(),
  createRequeteFromDematSocial: vi.fn().mockResolvedValue({
    id: 'requete-1',
    dematSocialId: 300000,
    createdAt: new Date('2024-01-01'),
  }),
}));

vi.mock('../../features/dematSocial/dematSocialImportFailure.service.js', () => ({
  createImportFailure: vi.fn(),
  markFailureAsResolved: vi.fn(),
}));

vi.mock('./dematSocial.adapter.js', () => ({
  mapDataForPrisma: vi.fn((_champs, dossierNumber, dateDepot) => ({
    dematSocialId: dossierNumber,
    createdAt: typeof dateDepot === 'string' ? new Date(dateDepot) : dateDepot,
    entiteIds: undefined,
  })),
}));

vi.mock('../../features/dematSocial/affectation/affectation.js', () => ({
  assignEntitesToRequeteTask: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../declarants/declarants.notification.service.js', () => ({
  sendDeclarantAcknowledgmentEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('dematSocial.service.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('finalisation operations', () => {
    it('accepts a dossier with notifications disabled', async () => {
      sendMock.mockResolvedValueOnce({ dossierAccepter: { dossier: { id: 'Dossier-123' }, errors: [] } });

      await acceptDossierWithoutNotification('Dossier-123', 'Motivation SIRENA');

      expect(sendMock).toHaveBeenCalledWith({
        dossierId: Buffer.from('Dossier-123').toString('base64'),
        instructeurId: Buffer.from('Instructeur-123').toString('base64'),
        motivation: 'Motivation SIRENA',
        disableNotification: true,
      });
    });

    it('passes a dossier to instruction with notifications disabled', async () => {
      sendMock.mockResolvedValueOnce({ dossierPasserEnInstruction: { dossier: { id: 'Dossier-123' }, errors: [] } });

      await updateInstruction('Dossier-123');

      expect(sendMock).toHaveBeenCalledWith({
        dossierId: Buffer.from('Dossier-123').toString('base64'),
        instructeurId: Buffer.from('Instructeur-123').toString('base64'),
        disableNotification: true,
      });
    });

    it('throws when accepting a dossier returns demat.social validation errors', async () => {
      sendMock.mockResolvedValueOnce({
        dossierAccepter: { dossier: null, errors: [{ message: 'Le dossier ne peut pas être accepté' }] },
      });

      await expect(acceptDossierWithoutNotification('Dossier-123', 'Motivation SIRENA')).rejects.toThrow(
        'Le dossier ne peut pas être accepté',
      );
    });
  });

  describe('getRequetes()', () => {
    it('should call graffle with correct variables and return filtered nodes', async () => {
      sendMock.mockResolvedValueOnce({
        demarche: {
          dossiers: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [{ number: 1 }, null, { number: 2 }],
          },
        },
      });

      const result = await getRequetes(new Date('2024-01-01'));

      expect(graffle.gql).toHaveBeenCalled();
      expect(sendMock).toHaveBeenCalledWith({
        demarcheNumber: 9999,
        createdSince: '2024-01-01T00:00:00.000Z',
        after: undefined,
        state: undefined,
      });

      expect(result).toEqual([{ number: 1 }, { number: 2 }]);
    });

    it('should return empty array when no dossiers found', async () => {
      sendMock.mockResolvedValueOnce({
        demarche: {
          dossiers: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: null,
          },
        },
      });

      const result = await getRequetes();
      expect(result).toEqual([]);
    });

    it('should pass dossier state filter when provided', async () => {
      sendMock.mockResolvedValueOnce({
        demarche: {
          dossiers: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [{ number: 3 }],
          },
        },
      });

      const result = await getRequetes(undefined, DossierState.EnInstruction);

      expect(sendMock).toHaveBeenCalledWith({
        demarcheNumber: 9999,
        createdSince: undefined,
        after: undefined,
        state: DossierState.EnInstruction,
      });
      expect(result).toEqual([{ number: 3 }]);
    });
  });

  describe('importRequetes()', () => {
    it('should call createRequeteFromDematSocial for each dossier number', async () => {
      const dateDepot = new Date('2024-01-01');

      sendMock.mockResolvedValueOnce({
        demarche: {
          dossiers: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              {
                number: 300000,
                dateDepot,
              },
              {
                number: 300001,
                dateDepot,
              },
            ],
          },
        },
      });

      vi.mocked(getRequeteByDematSocialId).mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      sendMock.mockResolvedValueOnce({
        dossier: {
          demandeur: { __typename: 'PersonnePhysique', civilite: 'M', nom: 'test', prenom: 'test' },
          usager: { email: 'test@test.fr' },
          champs: [],
          dateDepot: dateDepot.toISOString(),
          pdf: null,
        },
      });

      sendMock.mockResolvedValueOnce({
        dossierPasserEnInstruction: {
          dossier: {
            id: '1',
          },
        },
      });

      sendMock.mockResolvedValueOnce({
        dossier: {
          demandeur: { __typename: 'PersonneMorale' },
          usager: { email: 'test@test.fr' },
          champs: [],
          dateDepot: dateDepot.toISOString(),
          pdf: null,
        },
      });

      sendMock.mockResolvedValueOnce({
        dossierPasserEnInstruction: {
          dossier: {
            id: '2',
          },
        },
      });

      const result = await importRequetes(new Date('2024-01-01'));

      expect(createRequeteFromDematSocial).toHaveBeenCalledTimes(2);
      expect(createRequeteFromDematSocial).toHaveBeenCalledWith({
        dematSocialId: 300000,
        createdAt: dateDepot,
        entiteIds: undefined,
        pdf: null,
      });
      expect(createRequeteFromDematSocial).toHaveBeenCalledWith({
        dematSocialId: 300001,
        createdAt: dateDepot,
        entiteIds: undefined,
        pdf: null,
      });
      expect(result).toEqual({ count: 2, errorCount: 0, skippedCount: 0 });
    });

    it('should continue if dossier already exists', async () => {
      const dateDepot = new Date('2024-01-01');
      sendMock.mockResolvedValueOnce({
        demarche: {
          dossiers: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              {
                number: 300000,
                dateDepot,
              },
              {
                number: 300001,
                dateDepot,
              },
            ],
          },
        },
      });

      vi.mocked(getRequeteByDematSocialId)
        .mockResolvedValueOnce({
          id: '1',
          dematSocialId: 300000,
          sirecId: null,
          createdAt: dateDepot,
          updatedAt: dateDepot,
          createdById: null,
          commentaire: '',
          receptionDate: dateDepot,
          dateDemandeDeclarant: null,
          receptionTypeId: '1',
          provenanceId: null,
          provenancePrecision: null,
          thirdPartyAccountId: null,
        })
        .mockResolvedValueOnce({
          id: '2',
          dematSocialId: 300001,
          sirecId: null,
          createdAt: dateDepot,
          updatedAt: dateDepot,
          createdById: null,
          commentaire: '',
          receptionDate: dateDepot,
          dateDemandeDeclarant: null,
          receptionTypeId: '1',
          provenanceId: null,
          provenancePrecision: null,
          thirdPartyAccountId: null,
        });

      const result = await importRequetes(new Date('2024-01-01'));

      expect(createRequeteFromDematSocial).toHaveBeenCalledTimes(0);
      expect(result).toEqual({ count: 0, errorCount: 0, skippedCount: 0 });
    });

    it('should do nothing if no dossiers returned', async () => {
      sendMock.mockResolvedValueOnce({
        demarche: {
          dossiers: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [],
          },
        },
      });

      const result = await importRequetes();
      expect(createRequeteFromDematSocial).not.toHaveBeenCalled();
      expect(result).toEqual({ errorCount: 0, count: 0, skippedCount: 0 });
    });
  });

  describe('importSingleDossier()', () => {
    const makeFakeRequete = (id: string, dematSocialId: number, date: Date) => ({
      id,
      dematSocialId,
      sirecId: null,
      createdAt: date,
      updatedAt: date,
      createdById: null,
      commentaire: '',
      receptionDate: date,
      dateDemandeDeclarant: null,
      receptionTypeId: '1',
      provenanceId: null,
      provenancePrecision: null,
      thirdPartyAccountId: null,
    });

    it('creates a single requete when two jobs import the same dossier concurrently', async () => {
      const dossierNumber = 300000;
      const dateDepot = new Date('2024-01-01');

      sendMock.mockImplementation(async (variables: Record<string, unknown>) => {
        if ('dossierNumber' in variables) {
          return {
            dossier: {
              demandeur: { __typename: 'PersonnePhysique', civilite: 'M', nom: 'test', prenom: 'test' },
              usager: { email: 'test@test.fr' },
              champs: [],
              dateDepot: dateDepot.toISOString(),
              pdf: null,
            },
          };
        }
        return { dossierPasserEnInstruction: { dossier: { id: '1' } } };
      });

      const storedRequetes = new Map<number, ReturnType<typeof makeFakeRequete>>();

      vi.mocked(getRequeteByDematSocialId).mockImplementation(async (id) => storedRequetes.get(id) ?? null);

      vi.mocked(createRequeteFromDematSocial).mockImplementation(async ({ dematSocialId }) => {
        if (dematSocialId === null || storedRequetes.has(dematSocialId)) {
          throw Object.assign(new Error('Unique constraint failed on the fields: (`dematSocialId`)'), {
            code: 'P2002',
            meta: { target: ['dematSocialId'] },
          });
        }
        const requete = makeFakeRequete(`requete-${storedRequetes.size + 1}`, dematSocialId, dateDepot);
        storedRequetes.set(dematSocialId, requete);
        return requete;
      });

      const [first, second] = await Promise.all([
        importSingleDossier(dossierNumber),
        importSingleDossier(dossierNumber),
      ]);

      expect(storedRequetes.size).toBe(1);
      expect(first).toEqual({ success: true, requeteId: 'requete-1' });
      expect(second).toEqual({ success: true, requeteId: 'requete-1', alreadyImported: true });
      expect(createImportFailure).not.toHaveBeenCalled();
      expect(markFailureAsResolved).toHaveBeenCalledWith(dossierNumber, 'requete-1');
    });

    it('reports a failure when the unique violation is not on dematSocialId', async () => {
      const dossierNumber = 300002;
      const dateDepot = new Date('2024-01-01');

      sendMock.mockImplementation(async () => ({
        dossier: {
          demandeur: { __typename: 'PersonnePhysique', civilite: 'M', nom: 'test', prenom: 'test' },
          usager: { email: 'test@test.fr' },
          champs: [],
          dateDepot: dateDepot.toISOString(),
          pdf: null,
        },
      }));

      vi.mocked(getRequeteByDematSocialId).mockResolvedValue(null);
      vi.mocked(createRequeteFromDematSocial).mockRejectedValue(
        Object.assign(new Error('Unique constraint failed on the fields: (`sirecId`)'), {
          code: 'P2002',
          meta: { target: ['sirecId'] },
        }),
      );

      const result = await importSingleDossier(dossierNumber);

      expect(result).toEqual({ success: false });
      expect(createImportFailure).toHaveBeenCalledTimes(1);
    });
  });
});
