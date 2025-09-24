import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createOrGetFromDematSocial } from '@/features/requetes/requetes.service';
import { graffle } from '@/libs/graffle';
import { getRequetes, importRequetes } from './dematSocial.service';

const sendMock = vi.fn();

vi.mock('@/libs/graffle', () => {
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
  };
});

vi.mock('@/config/env', () => ({
  envVars: {
    DEMAT_SOCIAL_API_DIRECTORY: 9999,
  },
}));

vi.mock('@/libs/asyncLocalStorage', () => {
  const info = vi.fn();
  const error = vi.fn();
  const captureException = vi.fn();

  return {
    getLoggerStore: vi.fn(() => ({ info, error })),

    getSentryStore: vi.fn(() => ({ captureException })),

    abortControllerStorage: {
      getStore: vi.fn(() => new AbortController()),
    },
  };
});

vi.mock('@/features/requetes/requetes.service', () => ({
  createOrGetFromDematSocial: vi.fn(),
}));

vi.mock('./dematSocial.adaptater', () => ({
  mapDataForPrisma: vi.fn().mockReturnValue({
    dematSocialId: 101,
    createdAt: new Date('2024-01-01'),
    entiteIds: undefined,
  }),
}));

describe('dematSocial.service.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRequetes()', () => {
    it('should call graffle with correct variables and return filtered nodes', async () => {
      sendMock.mockResolvedValueOnce({
        demarche: { dossiers: { nodes: [{ number: 1 }, null, { number: 2 }] } },
      });

      const result = await getRequetes(new Date('2024-01-01'));

      expect(graffle.gql).toHaveBeenCalled();
      expect(sendMock).toHaveBeenCalledWith({
        demarcheNumber: 9999,
        createdSince: '2024-01-01T00:00:00.000Z',
      });

      expect(result).toEqual([{ number: 1 }, { number: 2 }]);
    });

    it('should return empty array when no dossiers found', async () => {
      sendMock.mockResolvedValueOnce({
        demarche: { dossiers: { nodes: null } },
      });

      const result = await getRequetes();
      expect(result).toEqual([]);
    });
  });

  describe('importRequetes()', () => {
    it('should call createRequeteFromDematSocial for each dossier number', async () => {
      const dateDepot = new Date('2024-01-01');
      // getRequetes
      sendMock.mockResolvedValueOnce({
        demarche: {
          dossiers: {
            nodes: [
              {
                number: 101,
                dateDepot,
              },
              {
                number: 102,
                dateDepot,
              },
            ],
          },
        },
      });

      // getRequete
      sendMock.mockResolvedValueOnce({
        dossier: {
          demandeur: { __typename: 'PersonnePhysique', civilite: 'M', nom: 'test', prenom: 'test' },
          usager: { email: 'test@test.fr' },
          champs: [],
        },
      });

      // getRequete
      sendMock.mockResolvedValueOnce({
        dossier: {
          demandeur: { __typename: 'PersonneMorale' },
          usager: { email: 'test@test.fr' },
          champs: [],
        },
      });

      vi.mocked(createOrGetFromDematSocial).mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      const result = await importRequetes(new Date('2024-01-01'));

      expect(createOrGetFromDematSocial).toHaveBeenCalledTimes(2);
      expect(createOrGetFromDematSocial).toHaveBeenCalledWith({
        dematSocialId: 101,
        createdAt: dateDepot,
        entiteIds: undefined,
      });
      expect(createOrGetFromDematSocial).toHaveBeenCalledWith({
        dematSocialId: 101,
        createdAt: dateDepot,
        entiteIds: undefined,
      });
      expect(result).toEqual({ count: 2, errorCount: 0 });
    });

    it('should do nothing if no dossiers returned', async () => {
      sendMock.mockResolvedValueOnce({
        demarche: { dossiers: { nodes: null } },
      });

      const result = await importRequetes();
      expect(createOrGetFromDematSocial).not.toHaveBeenCalled();
      expect(result).toEqual({ errorCount: 0, count: 0 });
    });
  });
});
