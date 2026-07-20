import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };

const mockedEnvVars = vi.hoisted(() => ({
  METABASE_SITE_URL: 'https://metabase.example.com',
  METABASE_SECRET_KEY: 'test-secret-key',
  METABASE_DASHBOARD_ID: '7',
  METABASE_DASHBOARD_ID_ADMIN: '9',
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

// Résultat structuré Metabase (data.cols + data.rows). Le service normalise chaque colonne
// avec ces cinq champs, donc l'objet produit ici sert aussi de valeur attendue via `.data`.
type TestCol = {
  name: string;
  display_name?: string;
  base_type?: string;
  semantic_type?: string | null;
  source?: string | null;
};
const cardResult = (cols: TestCol[], rows: unknown[][]) => ({
  data: {
    cols: cols.map((col) => ({
      name: col.name,
      display_name: col.display_name ?? col.name,
      base_type: col.base_type ?? 'type/Text',
      semantic_type: col.semantic_type ?? null,
      source: col.source ?? null,
    })),
    rows,
  },
});

describe('statistics.service.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedEnvVars.METABASE_SITE_URL = 'https://metabase.example.com';
    mockedEnvVars.METABASE_SECRET_KEY = 'test-secret-key';
    mockedEnvVars.METABASE_DASHBOARD_ID = '7';
    mockedEnvVars.METABASE_DASHBOARD_ID_ADMIN = '9';
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
          json: async () =>
            cardResult(
              [
                { name: 'month', display_name: 'Month', source: 'breakout' },
                { name: 'total', display_name: 'Total', base_type: 'type/Integer', source: 'aggregation' },
              ],
              [['2026-01', 12]],
            ),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () =>
            cardResult(
              [
                { name: 'entite', display_name: 'Entité', source: 'breakout' },
                { name: 'total', display_name: 'Total', base_type: 'type/Integer', source: 'aggregation' },
              ],
              [['ARS Île-de-France', 7]],
            ),
        });

      const { fetchDashboardCardsData } = await import('./statistics.service.js');
      const result = await fetchDashboardCardsData();

      expect(result).toEqual([
        {
          id: 42,
          dashcardId: 100,
          name: 'Requêtes par mois',
          display: null,
          layout: null,
          data: cardResult(
            [
              { name: 'month', display_name: 'Month', source: 'breakout' },
              { name: 'total', display_name: 'Total', base_type: 'type/Integer', source: 'aggregation' },
            ],
            [['2026-01', 12]],
          ).data,
        },
        {
          id: 43,
          dashcardId: 101,
          name: 'Top entités',
          display: null,
          layout: null,
          data: cardResult(
            [
              { name: 'entite', display_name: 'Entité', source: 'breakout' },
              { name: 'total', display_name: 'Total', base_type: 'type/Integer', source: 'aggregation' },
            ],
            [['ARS Île-de-France', 7]],
          ).data,
        },
      ]);

      expect(fetchMock).toHaveBeenCalledTimes(3);
      const [metadataCall, firstCardCall, secondCardCall] = fetchMock.mock.calls;
      expect(metadataCall[0]).toMatch(/^https:\/\/metabase\.example\.com\/api\/embed\/dashboard\/[^/]+$/);
      expect(firstCardCall[0]).toMatch(
        /^https:\/\/metabase\.example\.com\/api\/embed\/dashboard\/[^/]+\/dashcard\/100\/card\/42$/,
      );
      expect(secondCardCall[0]).toMatch(
        /^https:\/\/metabase\.example\.com\/api\/embed\/dashboard\/[^/]+\/dashcard\/101\/card\/43$/,
      );
    });

    it('supports the legacy ordered_cards payload shape', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ ordered_cards: [{ id: 200, card_id: 50, card: { id: 50, name: 'Legacy' } }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => cardResult([{ name: 'k', base_type: 'type/Integer' }], [[1]]),
        });

      const { fetchDashboardCardsData } = await import('./statistics.service.js');
      const result = await fetchDashboardCardsData();

      expect(result).toEqual([
        {
          id: 50,
          dashcardId: 200,
          name: 'Legacy',
          display: null,
          layout: null,
          data: cardResult([{ name: 'k', base_type: 'type/Integer' }], [[1]]).data,
        },
      ]);
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

    it('signs the token for the national dashboard id when scope is "national"', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ dashcards: [{ id: 100, card_id: 42, card: { id: 42, name: 'Total requêtes' } }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => cardResult([{ name: 'total', base_type: 'type/Integer' }], [[123]]),
        });

      const { fetchDashboardCardsData } = await import('./statistics.service.js');
      await fetchDashboardCardsData({}, {}, 'national');

      const [metadataCall] = fetchMock.mock.calls;
      const token = String(metadataCall[0]).split('/api/embed/dashboard/')[1];
      const decoded = jwt.verify(token, 'test-secret-key') as { resource: { dashboard: number } };
      expect(decoded.resource).toEqual({ dashboard: 9 });
    });

    it('throws 503 when the national dashboard id is not configured', async () => {
      mockedEnvVars.METABASE_DASHBOARD_ID_ADMIN = '';

      const { fetchDashboardCardsData } = await import('./statistics.service.js');
      await expect(fetchDashboardCardsData({}, {}, 'national')).rejects.toThrow(/^503:/);
      expect(fetchMock).not.toHaveBeenCalled();
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
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => cardResult([{ name: 'total', base_type: 'type/Integer' }], [[12]]),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'boom',
        });

      const { fetchDashboardCardsData } = await import('./statistics.service.js');
      const result = await fetchDashboardCardsData();

      expect(result).toEqual([
        {
          id: 42,
          dashcardId: 100,
          name: 'OK',
          display: null,
          layout: null,
          data: cardResult([{ name: 'total', base_type: 'type/Integer' }], [[12]]).data,
        },
        { id: 43, dashcardId: 101, name: 'KO', display: null, layout: null, data: { cols: [], rows: [] } },
      ]);
    });

    it('returns empty data for a dashcard whose payload has no cols/rows', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ dashcards: [{ id: 100, card_id: 42, card: { id: 42, name: 'Card' } }] }),
        })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ unexpected: 'shape' }) });

      const { fetchDashboardCardsData } = await import('./statistics.service.js');
      const result = await fetchDashboardCardsData();

      expect(result).toEqual([
        { id: 42, dashcardId: 100, name: 'Card', display: null, layout: null, data: { cols: [], rows: [] } },
      ]);
    });

    it('falls back to a generated name when the card has no name', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ dashcards: [{ id: 100, card_id: 42, card: { id: 42 } }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => cardResult([{ name: 'k', base_type: 'type/Integer' }], [[1]]),
        });

      const { fetchDashboardCardsData } = await import('./statistics.service.js');
      const result = await fetchDashboardCardsData();

      expect(result).toEqual([
        {
          id: 42,
          dashcardId: 100,
          name: 'Carte 42',
          display: null,
          layout: null,
          data: cardResult([{ name: 'k', base_type: 'type/Integer' }], [[1]]).data,
        },
      ]);
    });

    it('extracts the Metabase grid layout (col/row/size) and leaves it null when incomplete', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            dashcards: [
              { id: 100, card_id: 42, card: { id: 42, name: 'Placée' }, col: 6, row: 0, size_x: 12, size_y: 9 },
              // size_y manquant -> layout incomplet -> null
              { id: 101, card_id: 43, card: { id: 43, name: 'Sans layout' }, col: 0, row: 0, size_x: 6 },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => cardResult([{ name: 'k', base_type: 'type/Integer' }], [[1]]),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => cardResult([{ name: 'k', base_type: 'type/Integer' }], [[2]]),
        });

      const { fetchDashboardCardsData } = await import('./statistics.service.js');
      const result = await fetchDashboardCardsData();

      expect(result.map((card) => card.layout)).toEqual([{ col: 6, row: 0, sizeX: 12, sizeY: 9 }, null]);
    });

    it('reads the visualizer display override in priority, then falls back to card.display', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            dashcards: [
              // Override "visualizer" au niveau dashcard : prime sur card.display ("table")
              {
                id: 100,
                card_id: 42,
                card: { id: 42, name: 'Répartition', display: 'table' },
                visualization_settings: { visualization: { display: 'pie' } },
              },
              // Pas d'override : on retombe sur card.display
              { id: 101, card_id: 43, card: { id: 43, name: 'KPI', display: 'scalar' } },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () =>
            cardResult(
              [
                { name: 'raison', source: 'breakout' },
                { name: 'nb', base_type: 'type/Integer', source: 'aggregation' },
              ],
              [['A', 3]],
            ),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => cardResult([{ name: 'total', base_type: 'type/Integer' }], [[9]]),
        });

      const { fetchDashboardCardsData } = await import('./statistics.service.js');
      const result = await fetchDashboardCardsData();

      expect(result.map((card) => card.display)).toEqual(['pie', 'scalar']);
    });

    it('overrides display_name with the Visualization tab column_title (card and dashcard levels)', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            dashcards: [
              {
                id: 100,
                card_id: 42,
                card: {
                  id: 42,
                  name: 'Répartition',
                  display: 'table',
                  visualization_settings: {
                    column_settings: {
                      '["name","raison"]': { column_title: 'Motif du signalement' },
                      '["ref",["field","nb",{"base-type":"type/Integer"}]]': { column_title: 'Volume' },
                    },
                  },
                },
                // Override au niveau dashcard : prime sur la card pour la colonne "raison".
                visualization_settings: {
                  column_settings: {
                    '["name","raison"]': { column_title: 'Motif (dashcard)' },
                  },
                },
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () =>
            cardResult(
              [
                { name: 'raison', display_name: 'raison', source: 'breakout' },
                { name: 'nb', display_name: 'nb', base_type: 'type/Integer', source: 'aggregation' },
              ],
              [['A', 3]],
            ),
        });

      const { fetchDashboardCardsData } = await import('./statistics.service.js');
      const [card] = await fetchDashboardCardsData();

      expect(card.data.cols.map((col) => col.display_name)).toEqual(['Motif (dashcard)', 'Volume']);
    });

    it('leaves display_name untouched when no column_settings are present', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ dashcards: [{ id: 100, card_id: 42, card: { id: 42, name: 'Card' } }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => cardResult([{ name: 'raison', display_name: 'Raison', source: 'breakout' }], [['A']]),
        });

      const { fetchDashboardCardsData } = await import('./statistics.service.js');
      const [card] = await fetchDashboardCardsData();

      expect(card.data.cols.map((col) => col.display_name)).toEqual(['Raison']);
    });

    it('forwards params into the dashboard JWT so they reach Metabase locked filters', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ dashcards: [{ id: 100, card_id: 42, card: { id: 42, name: 'Card' } }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => cardResult([{ name: 'k', base_type: 'type/Integer' }], [[1]]),
        });

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

    it('keeps the token to locked params and passes declared optional filters as query string', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            parameters: [{ slug: 'entity_label' }, { slug: 'start_date' }, { slug: 'end_date' }],
            dashcards: [{ id: 100, card_id: 42, card: { id: 42, name: 'Card' } }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => cardResult([{ name: 'k', base_type: 'type/Integer' }], [[1]]),
        });

      const { fetchDashboardCardsData } = await import('./statistics.service.js');
      await fetchDashboardCardsData({ entity_label: 'UA 27' }, { start_date: '2026-01-01', end_date: '2026-03-31' });

      const [metadataCall, cardCall] = fetchMock.mock.calls;
      const tokenFromUrl = (url: string) => url.match(/\/dashboard\/([^/?]+)/)?.[1] ?? '';
      const decodeParams = (url: string) =>
        (jwt.verify(tokenFromUrl(url), 'test-secret-key') as { params: Record<string, unknown> }).params;

      expect(decodeParams(metadataCall[0] as string)).toEqual({ entity_label: 'UA 27' });
      expect(decodeParams(cardCall[0] as string)).toEqual({ entity_label: 'UA 27' });

      const cardUrl = new URL(cardCall[0] as string);
      expect(cardUrl.searchParams.get('start_date')).toBe('2026-01-01');
      expect(cardUrl.searchParams.get('end_date')).toBe('2026-03-31');
      expect(metadataCall[0]).not.toContain('?');
    });

    it('ignores optional filters that the dashboard does not declare', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            parameters: [{ slug: 'entity_label' }],
            dashcards: [{ id: 100, card_id: 42, card: { id: 42, name: 'Card' } }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => cardResult([{ name: 'k', base_type: 'type/Integer' }], [[1]]),
        });

      const { fetchDashboardCardsData } = await import('./statistics.service.js');
      await fetchDashboardCardsData({ entity_label: 'UA 27' }, { start_date: '2026-01-01' });

      const cardUrl = new URL(fetchMock.mock.calls[1][0] as string);
      expect(cardUrl.searchParams.has('start_date')).toBe(false);
    });

    it('extractDashboardParameterSlugs reads slugs and tolerates missing parameters', async () => {
      const { extractDashboardParameterSlugs } = await import('./statistics.service.js');
      expect(extractDashboardParameterSlugs({ parameters: [{ slug: 'a' }, { name: 'b' }, {}] })).toEqual(
        new Set(['a', 'b']),
      );
      expect(extractDashboardParameterSlugs({})).toEqual(new Set());
      expect(extractDashboardParameterSlugs(null)).toEqual(new Set());
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
