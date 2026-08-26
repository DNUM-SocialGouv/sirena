import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { pinoLogger } from 'hono-pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../helpers/errors.js';
import appWithLogs from '../../helpers/factories/appWithLogs.js';
import { getEntiteById } from '../entites/entites.service.js';
import { prepareExportRequetesCsv } from './exportRequetes/exportRequetes.service.js';
import StatisticsController from './statistics.controller.js';
import { fetchDashboardCardsData } from './statistics.service.js';

const entitesMiddlewareState = vi.hoisted(() => ({
  entiteIds: ['root-entite'] as string[] | null,
  topEntiteId: null as string | null,
}));

const authMiddlewareState = vi.hoisted(() => ({
  roleId: 'READER',
}));

const logger = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('hono-pino', () => ({
  pinoLogger: () => (c: Context, next: Next) => {
    c.set('logger', logger);
    return next();
  },
}));

vi.mock('./exportRequetes/exportRequetes.service.js', () => ({
  prepareExportRequetesCsv: vi.fn(),
}));

vi.mock('../entites/entites.service.js', () => ({
  getEntiteById: vi.fn(),
}));

vi.mock('./statistics.service.js', () => ({
  fetchDashboardCardsData: vi.fn(),
}));

vi.mock('../../middlewares/userStatus.middleware.js', () => ({
  default: (_: Context, next: Next) => next(),
}));

vi.mock('../../middlewares/auth.middleware.js', () => ({
  default: (c: Context, next: Next) => {
    c.set('userId', 'test-user-id');
    c.set('roleId', authMiddlewareState.roleId);
    return next();
  },
}));

vi.mock('../../middlewares/entites.middleware.js', () => ({
  default: (c: Context, next: Next) => {
    c.set('entiteIds', entitesMiddlewareState.entiteIds);
    c.set('topEntiteId', entitesMiddlewareState.topEntiteId);
    return next();
  },
}));

vi.mock('../../helpers/errors.js', async () => {
  const actual = await vi.importActual<typeof import('../../helpers/errors.js')>('../../helpers/errors.js');
  return {
    ...actual,
    errorHandler: vi.fn((err, c) => {
      if (actual.isHTTPException(err)) {
        return err.getResponse();
      }
      return c.json({ message: 'Internal server error' }, 500);
    }),
  };
});

describe('statistics.controller.ts', () => {
  const app = appWithLogs.createApp().use(pinoLogger()).route('/', StatisticsController).onError(errorHandler);
  const client = testClient(app);

  beforeEach(() => {
    vi.clearAllMocks();
    entitesMiddlewareState.entiteIds = ['root-entite'];
    entitesMiddlewareState.topEntiteId = null;
    authMiddlewareState.roleId = 'READER';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GET /export-requetes', () => {
    it('rejects export for a role without statistics read access', async () => {
      authMiddlewareState.roleId = 'PENDING';
      entitesMiddlewareState.topEntiteId = 'root-entite';

      const response = await client['export-requetes'].$get();

      expect(response.status).toBe(403);
      expect(prepareExportRequetesCsv).not.toHaveBeenCalled();
    });

    it('rejects export when the user has no root entity', async () => {
      const response = await client['export-requetes'].$get();

      expect(response.status).toBe(403);
      expect(prepareExportRequetesCsv).not.toHaveBeenCalled();
    });

    it('streams the generated CSV as a dated attachment', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-06-18T12:00:00.000Z'));
      entitesMiddlewareState.topEntiteId = 'root-entite';
      vi.mocked(prepareExportRequetesCsv).mockResolvedValueOnce(async (write) => {
        await write('\uFEFFNuméro de requête');
        await write('\nREQ-2026-0001');
      });

      const response = await client['export-requetes'].$get();

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/csv');
      expect(response.headers.get('content-disposition')).toBe(
        'attachment; filename="export-requetes-sirena-2026-06-18.csv"',
      );
      expect(await response.text()).toBe('Numéro de requête\nREQ-2026-0001');
      expect(prepareExportRequetesCsv).toHaveBeenCalledWith('root-entite');
      expect(logger.info).toHaveBeenCalledWith(
        {
          topEntiteId: 'root-entite',
          durationMs: expect.any(Number),
          csvSizeBytes: expect.any(Number),
        },
        '[statistics] export requêtes generated successfully',
      );
    });

    it('logs export failures before propagating the error', async () => {
      entitesMiddlewareState.topEntiteId = 'root-entite';
      const error = new Error('export failed');
      vi.mocked(prepareExportRequetesCsv).mockRejectedValueOnce(error);

      const response = await client['export-requetes'].$get();

      expect(response.status).toBe(500);
      expect(logger.error).toHaveBeenCalledWith(
        {
          err: error,
          topEntiteId: 'root-entite',
          durationMs: expect.any(Number),
        },
        '[statistics] export requêtes generation failed',
      );
    });

    it('logs a client abort as a normal outcome, not an export failure', async () => {
      entitesMiddlewareState.topEntiteId = 'root-entite';
      vi.mocked(prepareExportRequetesCsv).mockResolvedValueOnce(async (write) => {
        await write('\uFEFFNuméro de requête');
        await write('\nREQ-2026-0001');
      });

      const response = await client['export-requetes'].$get();
      await response.body?.cancel();

      await vi.waitFor(() =>
        expect(logger.info).toHaveBeenCalledWith(
          { topEntiteId: 'root-entite', durationMs: expect.any(Number), csvSizeBytes: expect.any(Number) },
          '[statistics] export requêtes aborted by the client',
        ),
      );
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('errors the body when the export fails after the response is committed, rather than truncating it', async () => {
      entitesMiddlewareState.topEntiteId = 'root-entite';
      const error = new Error('page read failed');
      vi.mocked(prepareExportRequetesCsv).mockResolvedValueOnce(async (write) => {
        await write('\uFEFFNuméro de requête');
        throw error;
      });

      const response = await client['export-requetes'].$get();

      // The status is already sent; erroring the stream is what lets the client tell a
      // failed export from a complete one.
      expect(response.status).toBe(200);
      await expect(response.text()).rejects.toThrow('page read failed');
      expect(logger.error).toHaveBeenCalledWith(
        {
          err: error,
          topEntiteId: 'root-entite',
          durationMs: expect.any(Number),
          csvSizeBytes: expect.any(Number),
        },
        '[statistics] export requêtes streaming failed',
      );
    });
  });

  describe('GET /dashboard', () => {
    it('serves the national dashboard for a super admin (entiteIds === null), without entity lock', async () => {
      authMiddlewareState.roleId = 'SUPER_ADMIN';
      entitesMiddlewareState.entiteIds = null;
      entitesMiddlewareState.topEntiteId = null;
      vi.mocked(fetchDashboardCardsData).mockResolvedValueOnce([]);

      const response = await client.dashboard.$get({ query: {} });

      expect(response.status).toBe(200);
      expect(fetchDashboardCardsData).toHaveBeenCalledWith(
        {},
        { start_date: undefined, end_date: undefined, domaine_fonctionnel: [] },
        'national',
      );
      expect(getEntiteById).not.toHaveBeenCalled();
    });

    it('scopes the dashboard to the user entity for a business role', async () => {
      entitesMiddlewareState.entiteIds = ['root-entite'];
      entitesMiddlewareState.topEntiteId = 'root-entite';
      vi.mocked(getEntiteById).mockResolvedValueOnce({ label: 'ARS Île-de-France' } as never);
      vi.mocked(fetchDashboardCardsData).mockResolvedValueOnce([]);

      const response = await client.dashboard.$get({ query: {} });

      expect(response.status).toBe(200);
      expect(fetchDashboardCardsData).toHaveBeenCalledWith(
        { entity_label: 'ARS Île-de-France' },
        { start_date: undefined, end_date: undefined, domaine_fonctionnel: [] },
      );
    });

    it('rejects a business role with no root entity', async () => {
      entitesMiddlewareState.entiteIds = ['root-entite'];
      entitesMiddlewareState.topEntiteId = null;

      const response = await client.dashboard.$get({ query: {} });

      expect(response.status).toBe(403);
      expect(fetchDashboardCardsData).not.toHaveBeenCalled();
    });

    it('forwards the selected domaines to Metabase as a repeatable array param, alongside the period', async () => {
      entitesMiddlewareState.topEntiteId = 'root-entite';
      vi.mocked(getEntiteById).mockResolvedValueOnce({ label: 'ARS Île-de-France' } as never);
      vi.mocked(fetchDashboardCardsData).mockResolvedValueOnce([]);

      const response = await client.dashboard.$get({
        query: { startDate: '2026-01-01', endDate: '2026-03-31', domaineIds: 'SOCIAL,SANITAIRE' },
      });

      expect(response.status).toBe(200);
      expect(fetchDashboardCardsData).toHaveBeenCalledWith(
        { entity_label: 'ARS Île-de-France' },
        { start_date: '2026-01-01', end_date: '2026-03-31', domaine_fonctionnel: ['SOCIAL', 'SANITAIRE'] },
      );
    });

    it('rejects an unknown domaine fonctionnel', async () => {
      entitesMiddlewareState.topEntiteId = 'root-entite';

      const response = await client.dashboard.$get({ query: { domaineIds: 'SOCIAL,NOT_A_DOMAINE' } });

      expect(response.status).toBe(400);
      expect(fetchDashboardCardsData).not.toHaveBeenCalled();
    });
  });
});
