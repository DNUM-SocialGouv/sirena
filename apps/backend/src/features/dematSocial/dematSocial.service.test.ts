import { beforeEach, describe, expect, it, vi } from 'vitest';
import { graffle } from '../../libs/graffle.js';
import { createRequeteFromDematSocial, getRequeteByDematSocialId } from '../requetes/requetes.service.js';
import { getRequetes, importRequetes } from './dematSocial.service.js';

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

describe('dematSocial.service.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
          createdAt: dateDepot,
          updatedAt: dateDepot,
          commentaire: '',
          receptionDate: dateDepot,
          receptionTypeId: '1',
        })
        .mockResolvedValueOnce({
          id: '2',
          dematSocialId: 300001,
          createdAt: dateDepot,
          updatedAt: dateDepot,
          commentaire: '',
          receptionDate: dateDepot,
          receptionTypeId: '1',
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
});
