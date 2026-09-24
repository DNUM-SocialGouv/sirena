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

  describe('extractDashboardTabs', () => {
    it('ignores malformed tabs and fills missing names and positions from the index', async () => {
      const { extractDashboardTabs } = await import('./statistics.service.js');

      expect(
        extractDashboardTabs({
          tabs: [{ id: 3, name: '  ', position: 2 }, { id: 'x', name: 'Bad' }, null, { id: 1, name: 'Premier' }],
        }),
      ).toEqual(
        [
          { id: 1, name: 'Premier', position: 3 },
          { id: 3, name: 'Onglet 1', position: 2 },
        ].sort((a, b) => a.position - b.position),
      );
    });

    it('returns an empty list when the payload has no tabs array', async () => {
      const { extractDashboardTabs } = await import('./statistics.service.js');

      expect(extractDashboardTabs(null)).toEqual([]);
      expect(extractDashboardTabs({ tabs: null })).toEqual([]);
      expect(extractDashboardTabs({ dashcards: [] })).toEqual([]);
    });
  });

  describe('fetchDashboardData', () => {
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

      const { fetchDashboardData } = await import('./statistics.service.js');
      const { cards: result } = await fetchDashboardData();

      expect(result).toEqual([
        {
          id: 42,
          dashcardId: 100,
          tabId: null,
          filterSlugs: [],
          name: 'Requêtes par mois',
          description: null,
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
          tabId: null,
          filterSlugs: [],
          name: 'Top entités',
          description: null,
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

      const { fetchDashboardData } = await import('./statistics.service.js');
      const { cards: result } = await fetchDashboardData();

      expect(result).toEqual([
        {
          id: 50,
          dashcardId: 200,
          tabId: null,
          filterSlugs: [],
          name: 'Legacy',
          description: null,
          display: null,
          layout: null,
          data: cardResult([{ name: 'k', base_type: 'type/Integer' }], [[1]]).data,
        },
      ]);
    });

    it('returns the dashboard tabs sorted by position and tags each card with its tab', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            id: 7,
            tabs: [
              { id: 12, name: 'Délais', position: 1 },
              { id: 11, name: 'Volumes', position: 0 },
            ],
            dashcards: [
              { id: 100, card_id: 42, dashboard_tab_id: 11, card: { id: 42, name: 'Total' } },
              { id: 101, card_id: 43, dashboard_tab_id: 12, card: { id: 43, name: 'Délai moyen' } },
            ],
          }),
        })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => cardResult([{ name: 'k' }], [[1]]) })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => cardResult([{ name: 'k' }], [[2]]) });

      const { fetchDashboardData } = await import('./statistics.service.js');
      const { tabs, cards } = await fetchDashboardData();

      expect(tabs).toEqual([
        { id: 11, name: 'Volumes', position: 0 },
        { id: 12, name: 'Délais', position: 1 },
      ]);
      expect(cards.map((card) => [card.id, card.tabId])).toEqual([
        [42, 11],
        [43, 12],
      ]);
    });

    it('returns no tabs and null tabIds for a dashboard without tabs', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            id: 7,
            tabs: [],
            dashcards: [{ id: 100, card_id: 42, dashboard_tab_id: null, card: { id: 42, name: 'Total' } }],
          }),
        })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => cardResult([{ name: 'k' }], [[1]]) });

      const { fetchDashboardData } = await import('./statistics.service.js');
      const { tabs, cards } = await fetchDashboardData();

      expect(tabs).toEqual([]);
      expect(cards.map((card) => card.tabId)).toEqual([null]);
    });

    it('still returns the tabs when the dashboard exposes no readable cards', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 7, tabs: [{ id: 11, name: 'Volumes', position: 0 }], dashcards: [] }),
      });

      const { fetchDashboardData } = await import('./statistics.service.js');

      await expect(fetchDashboardData()).resolves.toEqual({
        tabs: [{ id: 11, name: 'Volumes', position: 0 }],
        cards: [],
      });
    });

    it('translates dashcard parameter_mappings into the dashboard filter slugs', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            id: 7,
            parameters: [
              { id: 'p-start', slug: 'start_date' },
              { id: 'p-end', slug: 'end_date' },
              { id: 'p-dom', slug: 'domaine_fonctionnel' },
            ],
            dashcards: [
              {
                id: 100,
                card_id: 42,
                card: { id: 42, name: 'Filtrée' },
                parameter_mappings: [
                  { parameter_id: 'p-dom', card_id: 42 },
                  { parameter_id: 'p-start', card_id: 42 },
                  { parameter_id: 'p-start', card_id: 42 },
                  { parameter_id: 'p-unknown', card_id: 42 },
                ],
              },
              { id: 101, card_id: 43, card: { id: 43, name: 'Sans filtre' }, parameter_mappings: [] },
              { id: 102, card_id: 44, card: { id: 44, name: 'Sans mapping' } },
            ],
          }),
        })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => cardResult([{ name: 'k' }], [[1]]) })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => cardResult([{ name: 'k' }], [[2]]) })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => cardResult([{ name: 'k' }], [[3]]) });

      const { fetchDashboardData } = await import('./statistics.service.js');
      const { cards } = await fetchDashboardData();

      expect(cards.map((card) => card.filterSlugs)).toEqual([['domaine_fonctionnel', 'start_date'], [], []]);
    });

    it('sends a multi-valued optional filter as a repeated query param', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            parameters: [{ slug: 'domaine_fonctionnel' }, { slug: 'start_date' }],
            dashcards: [{ id: 100, card_id: 42, card: { id: 42, name: 'KPI' } }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => cardResult([{ name: 'k', base_type: 'type/Integer' }], [[1]]),
        });

      const { fetchDashboardData } = await import('./statistics.service.js');
      await fetchDashboardData({}, { start_date: '2026-01-01', domaine_fonctionnel: ['SOCIAL', 'SANITAIRE'] });

      const [, cardCall] = fetchMock.mock.calls;
      const { searchParams } = new URL(cardCall[0] as string);
      expect(searchParams.getAll('domaine_fonctionnel')).toEqual(['SOCIAL', 'SANITAIRE']);
      expect(searchParams.get('start_date')).toBe('2026-01-01');
    });

    it('warns when the dashboard declares a filter slug Sirena does not know', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            parameters: [{ slug: 'start_date' }, { slug: 'domaine_fonctionnel_v2' }],
            dashcards: [{ id: 100, card_id: 42, card: { id: 42, name: 'KPI' } }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => cardResult([{ name: 'k', base_type: 'type/Integer' }], [[1]]),
        });

      const { fetchDashboardData } = await import('./statistics.service.js');
      await fetchDashboardData();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ dashboardId: 7, unknownSlugs: ['domaine_fonctionnel_v2'] }),
        expect.stringContaining('unknown to Sirena'),
      );
    });

    it('does not warn when every declared filter slug is known', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            parameters: [{ slug: 'start_date' }, { slug: 'end_date' }, { slug: 'inclure_eig' }],
            dashcards: [{ id: 100, card_id: 42, card: { id: 42, name: 'KPI' } }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => cardResult([{ name: 'k', base_type: 'type/Integer' }], [[1]]),
        });

      const { fetchDashboardData } = await import('./statistics.service.js');
      await fetchDashboardData();

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('omits an empty multi-valued filter instead of filtering on nothing', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            parameters: [{ slug: 'domaine_fonctionnel' }],
            dashcards: [{ id: 100, card_id: 42, card: { id: 42, name: 'KPI' } }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => cardResult([{ name: 'k', base_type: 'type/Integer' }], [[1]]),
        });

      const { fetchDashboardData } = await import('./statistics.service.js');
      await fetchDashboardData({}, { domaine_fonctionnel: [] });

      const [, cardCall] = fetchMock.mock.calls;
      expect(cardCall[0]).not.toContain('domaine_fonctionnel');
      expect(cardCall[0]).not.toContain('?');
    });

    it('returns an empty array when the dashboard exposes no readable cards', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ dashcards: [] }),
      });

      const { fetchDashboardData } = await import('./statistics.service.js');
      const { cards: result } = await fetchDashboardData();

      expect(result).toEqual([]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('throws 503 when Metabase dashboard metadata fetch fails', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' });

      const { fetchDashboardData } = await import('./statistics.service.js');
      await expect(fetchDashboardData()).rejects.toThrow(/^503:/);
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

      const { fetchDashboardData } = await import('./statistics.service.js');
      await fetchDashboardData({}, {}, 'national');

      const [metadataCall] = fetchMock.mock.calls;
      const token = String(metadataCall[0]).split('/api/embed/dashboard/')[1];
      const decoded = jwt.verify(token, 'test-secret-key') as { resource: { dashboard: number } };
      expect(decoded.resource).toEqual({ dashboard: 9 });
    });

    it('throws 503 when the national dashboard id is not configured', async () => {
      mockedEnvVars.METABASE_DASHBOARD_ID_ADMIN = '';

      const { fetchDashboardData } = await import('./statistics.service.js');
      await expect(fetchDashboardData({}, {}, 'national')).rejects.toThrow(/^503:/);
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

      const { fetchDashboardData } = await import('./statistics.service.js');
      const { cards: result } = await fetchDashboardData();

      expect(result).toEqual([
        {
          id: 42,
          dashcardId: 100,
          tabId: null,
          filterSlugs: [],
          name: 'OK',
          description: null,
          display: null,
          layout: null,
          data: cardResult([{ name: 'total', base_type: 'type/Integer' }], [[12]]).data,
        },
        {
          id: 43,
          dashcardId: 101,
          tabId: null,
          filterSlugs: [],
          name: 'KO',
          description: null,
          display: null,
          layout: null,
          data: { cols: [], rows: [] },
        },
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

      const { fetchDashboardData } = await import('./statistics.service.js');
      const { cards: result } = await fetchDashboardData();

      expect(result).toEqual([
        {
          id: 42,
          dashcardId: 100,
          tabId: null,
          filterSlugs: [],
          name: 'Card',
          description: null,
          display: null,
          layout: null,
          data: { cols: [], rows: [] },
        },
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

      const { fetchDashboardData } = await import('./statistics.service.js');
      const { cards: result } = await fetchDashboardData();

      expect(result).toEqual([
        {
          id: 42,
          dashcardId: 100,
          tabId: null,
          filterSlugs: [],
          name: 'Carte 42',
          description: null,
          display: null,
          layout: null,
          data: cardResult([{ name: 'k', base_type: 'type/Integer' }], [[1]]).data,
        },
      ]);
    });

    it('extracts the card description, leaving it null when absent or blank', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            dashcards: [
              {
                id: 100,
                card_id: 42,
                card: { id: 42, name: 'Avec desc', description: '  Nombre total de requêtes  ' },
              },
              { id: 101, card_id: 43, card: { id: 43, name: 'Sans desc' } },
              { id: 102, card_id: 44, card: { id: 44, name: 'Desc vide', description: '   ' } },
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
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => cardResult([{ name: 'k', base_type: 'type/Integer' }], [[3]]),
        });

      const { fetchDashboardData } = await import('./statistics.service.js');
      const { cards: result } = await fetchDashboardData();

      expect(result.map((card) => card.description)).toEqual(['Nombre total de requêtes', null, null]);
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

      const { fetchDashboardData } = await import('./statistics.service.js');
      const { cards: result } = await fetchDashboardData();

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

      const { fetchDashboardData } = await import('./statistics.service.js');
      const { cards: result } = await fetchDashboardData();

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

      const { fetchDashboardData } = await import('./statistics.service.js');
      const {
        cards: [card],
      } = await fetchDashboardData();

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

      const { fetchDashboardData } = await import('./statistics.service.js');
      const {
        cards: [card],
      } = await fetchDashboardData();

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

      const { fetchDashboardData } = await import('./statistics.service.js');
      await fetchDashboardData({ entity_label: 'UA 27' });

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

      const { fetchDashboardData } = await import('./statistics.service.js');
      await fetchDashboardData({ entity_label: 'UA 27' }, { start_date: '2026-01-01', end_date: '2026-03-31' });

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

      const { fetchDashboardData } = await import('./statistics.service.js');
      await fetchDashboardData({ entity_label: 'UA 27' }, { start_date: '2026-01-01' });

      const cardUrl = new URL(fetchMock.mock.calls[1][0] as string);
      expect(cardUrl.searchParams.has('start_date')).toBe(false);
    });

    it('throws 503 when the dashboard id is missing', async () => {
      vi.resetModules();
      mockedEnvVars.METABASE_DASHBOARD_ID = '';

      const { fetchDashboardData } = await import('./statistics.service.js');
      await expect(fetchDashboardData()).rejects.toThrow(/^503:Metabase dashboard id is not configured/);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
