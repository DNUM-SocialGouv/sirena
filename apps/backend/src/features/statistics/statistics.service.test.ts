import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };

const mockedEnvVars = vi.hoisted(() => ({
  METABASE_SITE_URL: 'https://metabase.example.com',
  METABASE_SECRET_KEY: 'test-secret-key',
  METABASE_DASHBOARD_ID: '7',
}));

vi.mock('../../config/env.js', () => ({
  envVars: mockedEnvVars,
}));

vi.mock('../../libs/asyncLocalStorage.js', () => ({
  getLoggerStore: vi.fn(() => logger),
}));

vi.mock('@sirena/backend-utils/helpers', () => ({
  throwHTTPException503ServiceUnavailable: vi.fn((msg?: string) => {
    throw new Error(`503:${msg ?? ''}`);
  }),
}));

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('statistics.service.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedEnvVars.METABASE_SITE_URL = 'https://metabase.example.com';
    mockedEnvVars.METABASE_SECRET_KEY = 'test-secret-key';
    mockedEnvVars.METABASE_DASHBOARD_ID = '7';
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('signMetabaseDashboardToken', () => {
    it('signs a JWT with the dashboard ID and a future expiry', async () => {
      const { signMetabaseDashboardToken } = await import('./statistics.service.js');
      const token = signMetabaseDashboardToken(7, 'test-secret-key');

      const decoded = jwt.verify(token, 'test-secret-key') as {
        resource: { dashboard: number };
        params: Record<string, unknown>;
        exp: number;
      };

      expect(decoded.resource).toEqual({ dashboard: 7 });
      expect(decoded.params).toEqual({});
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('locks the given params inside the JWT', async () => {
      const { signMetabaseDashboardToken } = await import('./statistics.service.js');
      const token = signMetabaseDashboardToken(7, 'test-secret-key', { entity_label: 'UA 27' });

      const decoded = jwt.verify(token, 'test-secret-key') as {
        resource: { dashboard: number };
        params: Record<string, unknown>;
      };

      expect(decoded.params).toEqual({ entity_label: 'UA 27' });
    });
  });

  describe('fetchDashboardCardsData', () => {
    it('aggregates data for every dashcard of the configured dashboard', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            id: 7,
            name: 'Statistiques',
            dashcards: [
              { id: 100, card_id: 42, card: { id: 42, name: 'Requêtes par mois' } },
              { id: 101, card_id: 43, card: { id: 43, name: 'Top entités' } },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [{ month: '2026-01', total: 12 }],
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [{ entite: 'ARS Île-de-France', total: 7 }],
        });

      const { fetchDashboardCardsData } = await import('./statistics.service.js');
      const result = await fetchDashboardCardsData();

      expect(result).toEqual([
        { id: 42, dashcardId: 100, name: 'Requêtes par mois', data: [{ month: '2026-01', total: 12 }] },
        { id: 43, dashcardId: 101, name: 'Top entités', data: [{ entite: 'ARS Île-de-France', total: 7 }] },
      ]);

      expect(fetchMock).toHaveBeenCalledTimes(3);
      const [metadataCall, firstCardCall, secondCardCall] = fetchMock.mock.calls;
      expect(metadataCall[0]).toMatch(/^https:\/\/metabase\.example\.com\/api\/embed\/dashboard\/[^/]+$/);
      expect(firstCardCall[0]).toMatch(
        /^https:\/\/metabase\.example\.com\/api\/embed\/dashboard\/[^/]+\/dashcard\/100\/card\/42\/json$/,
      );
      expect(secondCardCall[0]).toMatch(
        /^https:\/\/metabase\.example\.com\/api\/embed\/dashboard\/[^/]+\/dashcard\/101\/card\/43\/json$/,
      );
    });

    it('supports the legacy ordered_cards payload shape', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ ordered_cards: [{ id: 200, card_id: 50, card: { id: 50, name: 'Legacy' } }] }),
        })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [{ k: 1 }] });

      const { fetchDashboardCardsData } = await import('./statistics.service.js');
      const result = await fetchDashboardCardsData();

      expect(result).toEqual([{ id: 50, dashcardId: 200, name: 'Legacy', data: [{ k: 1 }] }]);
    });

    it('returns an empty array when the dashboard exposes no readable cards', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ dashcards: [] }),
      });

      const { fetchDashboardCardsData } = await import('./statistics.service.js');
      const result = await fetchDashboardCardsData();

      expect(result).toEqual([]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('throws 503 when Metabase dashboard metadata fetch fails', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' });

      const { fetchDashboardCardsData } = await import('./statistics.service.js');
      await expect(fetchDashboardCardsData()).rejects.toThrow(/^503:/);
    });

    it('degrades gracefully when a single dashcard fetch fails', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            dashcards: [
              { id: 100, card_id: 42, card: { id: 42, name: 'OK' } },
              { id: 101, card_id: 43, card: { id: 43, name: 'KO' } },
            ],
          }),
        })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [{ total: 12 }] })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'boom',
        });

      const { fetchDashboardCardsData } = await import('./statistics.service.js');
      const result = await fetchDashboardCardsData();

      expect(result).toEqual([
        { id: 42, dashcardId: 100, name: 'OK', data: [{ total: 12 }] },
        { id: 43, dashcardId: 101, name: 'KO', data: [] },
      ]);
    });

    it('returns empty data for a dashcard whose payload is not an array', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ dashcards: [{ id: 100, card_id: 42, card: { id: 42, name: 'Card' } }] }),
        })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ unexpected: 'shape' }) });

      const { fetchDashboardCardsData } = await import('./statistics.service.js');
      const result = await fetchDashboardCardsData();

      expect(result).toEqual([{ id: 42, dashcardId: 100, name: 'Card', data: [] }]);
    });

    it('falls back to a generated name when the card has no name', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ dashcards: [{ id: 100, card_id: 42, card: { id: 42 } }] }),
        })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [{ k: 1 }] });

      const { fetchDashboardCardsData } = await import('./statistics.service.js');
      const result = await fetchDashboardCardsData();

      expect(result).toEqual([{ id: 42, dashcardId: 100, name: 'Carte 42', data: [{ k: 1 }] }]);
    });

    it('forwards params into the dashboard JWT so they reach Metabase locked filters', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ dashcards: [{ id: 100, card_id: 42, card: { id: 42, name: 'Card' } }] }),
        })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [{ k: 1 }] });

      const { fetchDashboardCardsData } = await import('./statistics.service.js');
      await fetchDashboardCardsData({ entity_label: 'UA 27' });

      const metadataUrl = fetchMock.mock.calls[0][0] as string;
      const token = metadataUrl.split('/').pop();
      const decoded = jwt.verify(token ?? '', 'test-secret-key') as {
        resource: { dashboard: number };
        params: Record<string, unknown>;
      };
      expect(decoded.params).toEqual({ entity_label: 'UA 27' });
    });

    it('throws 503 when the dashboard id is missing', async () => {
      vi.resetModules();
      mockedEnvVars.METABASE_DASHBOARD_ID = '';

      const { fetchDashboardCardsData } = await import('./statistics.service.js');
      await expect(fetchDashboardCardsData()).rejects.toThrow(/^503:Metabase dashboard id is not configured/);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
