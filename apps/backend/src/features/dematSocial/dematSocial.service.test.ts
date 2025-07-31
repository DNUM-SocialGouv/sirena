import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequeteFromDematSocial } from '@/features/requetes/requetes.service';
import { graffle } from '@/libs/graffle';
import { getRequetes, importRequetes } from './dematSocial.service';

const sendMock = vi.fn();

vi.mock('@/libs/graffle', () => ({
  graffle: {
    gql: vi.fn(() => ({
      send: sendMock,
    })),
  },
  GetDossiersByDateDocument: vi.fn(),
}));

vi.mock('@/features/requetes/requetes.service', () => ({
  createRequeteFromDematSocial: vi.fn(),
}));

vi.mock('@/config/env', () => ({
  envVars: {
    DEMAT_SOCIAL_API_DIRECTORY: 9999,
  },
}));

const mockedCreate = vi.mocked(createRequeteFromDematSocial);

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
      sendMock.mockResolvedValueOnce({
        demarche: {
          dossiers: {
            nodes: [
              { number: 101, dateDepot },
              { number: 102, dateDepot },
            ],
          },
        },
      });

      await importRequetes(new Date('2024-01-01'));

      expect(mockedCreate).toHaveBeenCalledTimes(2);
      expect(mockedCreate).toHaveBeenCalledWith({ dematSocialId: 101, createdAt: dateDepot });
      expect(mockedCreate).toHaveBeenCalledWith({ dematSocialId: 102, createdAt: dateDepot });
    });

    it('should do nothing if no dossiers returned', async () => {
      sendMock.mockResolvedValueOnce({
        demarche: { dossiers: { nodes: null } },
      });

      await importRequetes();
      expect(mockedCreate).not.toHaveBeenCalled();
    });
  });
});
