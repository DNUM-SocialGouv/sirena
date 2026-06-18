import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { pinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../helpers/errors.js';
import appWithLogs from '../../helpers/factories/appWithLogs.js';
import { generateExportRequetesCsv } from './exportRequetes/exportRequetes.service.js';
import StatisticsController from './statistics.controller.js';

const entitesMiddlewareState = vi.hoisted(() => ({
  entiteIds: ['root-entite'],
  topEntiteId: null as string | null,
}));

vi.mock('./exportRequetes/exportRequetes.service.js', () => ({
  generateExportRequetesCsv: vi.fn(),
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
  });

  describe('GET /export-requetes', () => {
    it('rejects export when the user has no root entity', async () => {
      const response = await client['export-requetes'].$get();

      expect(response.status).toBe(403);
      expect(generateExportRequetesCsv).not.toHaveBeenCalled();
    });

    it('returns the generated CSV as a dated attachment', async () => {
      entitesMiddlewareState.topEntiteId = 'root-entite';
      vi.mocked(generateExportRequetesCsv).mockResolvedValueOnce('\uFEFFNuméro de requête\nREQ-2026-0001');

      const response = await client['export-requetes'].$get();

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/csv');
      expect(response.headers.get('content-disposition')).toBe(
        'attachment; filename="export-requetes-sirena-2026-06-18.csv"',
      );
      expect(await response.text()).toBe('Numéro de requête\nREQ-2026-0001');
      expect(generateExportRequetesCsv).toHaveBeenCalledWith('root-entite');
    });
  });
});
