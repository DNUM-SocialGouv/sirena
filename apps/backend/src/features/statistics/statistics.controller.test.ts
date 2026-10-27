import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { pinoLogger } from 'hono-pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../helpers/errors.js';
import appWithLogs from '../../helpers/factories/appWithLogs.js';
import { findActiveDocumentExport } from '../documentExports/documentExports.service.js';
import { getEntiteById } from '../entites/entites.service.js';
import { requestExportRequetes } from './exportRequetes/requestExportRequetes.service.js';
import StatisticsController from './statistics.controller.js';
import { fetchDashboardData } from './statistics.service.js';

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

vi.mock('./exportRequetes/requestExportRequetes.service.js', () => ({
  requestExportRequetes: vi.fn(),
}));

vi.mock('../documentExports/documentExports.service.js', () => ({
  DOCUMENT_EXPORT_TYPE: { REQUETES_CSV: 'REQUETES_CSV' },
  findActiveDocumentExport: vi.fn(),
}));

vi.mock('../entites/entites.service.js', () => ({
  getEntiteById: vi.fn(),
}));

vi.mock('./statistics.service.js', () => ({
  fetchDashboardData: vi.fn(),
}));

vi.mock('../../middlewares/userStatus.middleware.js', () => ({
  default: (_: Context, next: Next) => next(),
}));

vi.mock('../../middlewares/auth.middleware.js', () => ({
  default: (c: Context, next: Next) => {
    c.set('userId', 'test-user-id');
    c.set('roleId', authMiddlewareState.roleId);
    c.set('user', { id: 'test-user-id', email: 'agent@sante.gouv.fr' });
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

  describe('POST /requetes-export', () => {
    const TODAY = '2026-10-26';

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(`${TODAY}T10:00:00.000Z`));
    });

    const postExport = (json: { startDate: string; endDate: string }) => client['requetes-export'].$post({ json });

    it('rejects export for a role without statistics read access', async () => {
      authMiddlewareState.roleId = 'PENDING';
      entitesMiddlewareState.topEntiteId = 'root-entite';

      const response = await postExport({ startDate: '2026-09-26', endDate: TODAY });

      expect(response.status).toBe(403);
      expect(requestExportRequetes).not.toHaveBeenCalled();
    });

    it('rejects export when the user has no root entity (super admin)', async () => {
      authMiddlewareState.roleId = 'SUPER_ADMIN';
      entitesMiddlewareState.entiteIds = null;

      const response = await postExport({ startDate: '2026-09-26', endDate: TODAY });

      expect(response.status).toBe(403);
      expect(requestExportRequetes).not.toHaveBeenCalled();
    });

    it.each([
      {
        name: 'a start date after the end date (CA5)',
        period: { startDate: '2026-10-10', endDate: '2026-10-01' },
        code: 'START_AFTER_END',
        message: 'La date de début doit être antérieure ou égale à la date de fin',
      },
      {
        name: 'an end date after today (CA6)',
        period: { startDate: '2026-10-01', endDate: '2026-10-27' },
        code: 'END_DATE_IN_FUTURE',
        message: 'La date de début doit être antérieure ou égale à la date de fin',
      },
      {
        name: 'a period longer than 36 months (CA7)',
        period: { startDate: '2023-10-25', endDate: TODAY },
        code: 'PERIOD_TOO_LONG',
        message: 'La période sélectionnée ne peut pas dépasser 36 mois.',
      },
      {
        name: 'a missing date',
        period: { startDate: '', endDate: TODAY },
        code: 'START_DATE_REQUIRED',
        message: "Renseignez la date de début de l'export. Format attendu : JJ/MM/AAAA",
      },
    ])('rejects $name without launching the export', async ({ period, code, message }) => {
      entitesMiddlewareState.topEntiteId = 'root-entite';

      const response = await postExport(period);

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ message, cause: { code } });
      expect(requestExportRequetes).not.toHaveBeenCalled();
    });

    it('queues the export for a period of exactly 36 months and returns the recipient e-mail (CA8)', async () => {
      entitesMiddlewareState.topEntiteId = 'root-entite';
      vi.mocked(requestExportRequetes).mockResolvedValueOnce({ ok: true, documentExportId: 'export-1' });

      const response = await postExport({ startDate: '2023-10-26', endDate: TODAY });

      expect(response.status).toBe(202);
      expect(await response.json()).toEqual({ data: { id: 'export-1', email: 'agent@sante.gouv.fr' } });
      expect(requestExportRequetes).toHaveBeenCalledWith({
        userId: 'test-user-id',
        topEntiteId: 'root-entite',
        startDate: '2023-10-26',
        endDate: TODAY,
        path: '/requetes-export',
        requestId: null,
      });
    });

    it('answers 400 with the ticket message when no requête matches the period (CA20)', async () => {
      entitesMiddlewareState.topEntiteId = 'root-entite';
      vi.mocked(requestExportRequetes).mockResolvedValueOnce({ ok: false, code: 'NO_REQUETE' });

      const response = await postExport({ startDate: '2026-09-26', endDate: TODAY });

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        message: 'Aucune requête ne correspond à la période sélectionnée',
        cause: { code: 'NO_REQUETE' },
      });
    });

    it('answers 409 when an export is already in progress for the user (CA17)', async () => {
      entitesMiddlewareState.topEntiteId = 'root-entite';
      vi.mocked(requestExportRequetes).mockResolvedValueOnce({ ok: false, code: 'EXPORT_IN_PROGRESS' });

      const response = await postExport({ startDate: '2026-09-26', endDate: TODAY });

      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ cause: { code: 'EXPORT_IN_PROGRESS' } });
    });
  });

  describe('GET /requetes-export/status', () => {
    it("reports an export in progress for the user so the button stays disabled until it's done", async () => {
      vi.mocked(findActiveDocumentExport).mockResolvedValueOnce({ id: 'export-1' });

      const response = await client['requetes-export'].status.$get();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ data: { inProgress: true } });
      expect(findActiveDocumentExport).toHaveBeenCalledWith('test-user-id', 'REQUETES_CSV');
    });

    it('reports no export in progress', async () => {
      vi.mocked(findActiveDocumentExport).mockResolvedValueOnce(null);

      const response = await client['requetes-export'].status.$get();

      expect(await response.json()).toEqual({ data: { inProgress: false } });
    });
  });

  describe('GET /dashboard', () => {
    it('serves the national dashboard for a super admin (entiteIds === null), without entity lock', async () => {
      authMiddlewareState.roleId = 'SUPER_ADMIN';
      entitesMiddlewareState.entiteIds = null;
      entitesMiddlewareState.topEntiteId = null;
      vi.mocked(fetchDashboardData).mockResolvedValueOnce({ tabs: [], cards: [] });

      const response = await client.dashboard.$get({ query: {} });

      expect(response.status).toBe(200);
      expect(fetchDashboardData).toHaveBeenCalledWith(
        {},
        {
          start_date: undefined,
          end_date: undefined,
          domaine_fonctionnel: [],
          inclure_eig: undefined,
          lieu_de_survenue: [],
        },
        'national',
        expect.any(AbortSignal),
      );
      expect(getEntiteById).not.toHaveBeenCalled();
    });

    it('scopes the dashboard to the user entity for a business role', async () => {
      entitesMiddlewareState.entiteIds = ['root-entite'];
      entitesMiddlewareState.topEntiteId = 'root-entite';
      vi.mocked(getEntiteById).mockResolvedValueOnce({ label: 'ARS Île-de-France' } as never);
      const dashboard = { tabs: [{ id: 11, name: 'Volumes', position: 0 }], cards: [] };
      vi.mocked(fetchDashboardData).mockResolvedValueOnce(dashboard);

      const response = await client.dashboard.$get({ query: {} });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ data: dashboard });
      expect(fetchDashboardData).toHaveBeenCalledWith(
        { entity_label: 'ARS Île-de-France' },
        {
          start_date: undefined,
          end_date: undefined,
          domaine_fonctionnel: [],
          inclure_eig: undefined,
          lieu_de_survenue: [],
        },
        'local',
        expect.any(AbortSignal),
      );
    });

    it('rejects a business role with no root entity', async () => {
      entitesMiddlewareState.entiteIds = ['root-entite'];
      entitesMiddlewareState.topEntiteId = null;

      const response = await client.dashboard.$get({ query: {} });

      expect(response.status).toBe(403);
      expect(fetchDashboardData).not.toHaveBeenCalled();
    });

    it('forwards the selected domaines to Metabase as a repeatable array param, alongside the period', async () => {
      entitesMiddlewareState.topEntiteId = 'root-entite';
      vi.mocked(getEntiteById).mockResolvedValueOnce({ label: 'ARS Île-de-France' } as never);
      vi.mocked(fetchDashboardData).mockResolvedValueOnce({ tabs: [], cards: [] });

      const response = await client.dashboard.$get({
        query: { startDate: '2026-01-01', endDate: '2026-03-31', domaineIds: 'SOCIAL,SANITAIRE' },
      });

      expect(response.status).toBe(200);
      expect(fetchDashboardData).toHaveBeenCalledWith(
        { entity_label: 'ARS Île-de-France' },
        {
          start_date: '2026-01-01',
          end_date: '2026-03-31',
          domaine_fonctionnel: ['SOCIAL', 'SANITAIRE'],
          inclure_eig: undefined,
          lieu_de_survenue: [],
        },
        'local',
        expect.any(AbortSignal),
      );
    });

    it('forwards the EIG exclusion to Metabase when the box is unchecked', async () => {
      entitesMiddlewareState.topEntiteId = 'root-entite';
      vi.mocked(getEntiteById).mockResolvedValueOnce({ label: 'ARS Île-de-France' } as never);
      vi.mocked(fetchDashboardData).mockResolvedValueOnce({ tabs: [], cards: [] });

      const response = await client.dashboard.$get({ query: { includeEIG: 'false' } });

      expect(response.status).toBe(200);
      expect(fetchDashboardData).toHaveBeenCalledWith(
        { entity_label: 'ARS Île-de-France' },
        {
          start_date: undefined,
          end_date: undefined,
          domaine_fonctionnel: [],
          inclure_eig: 'false',
          lieu_de_survenue: [],
        },
        'local',
        expect.any(AbortSignal),
      );
    });

    it('forwards the EIG exclusion on the national dashboard too', async () => {
      authMiddlewareState.roleId = 'SUPER_ADMIN';
      entitesMiddlewareState.entiteIds = null;
      entitesMiddlewareState.topEntiteId = null;
      vi.mocked(fetchDashboardData).mockResolvedValueOnce({ tabs: [], cards: [] });

      const response = await client.dashboard.$get({ query: { includeEIG: 'false' } });

      expect(response.status).toBe(200);
      expect(fetchDashboardData).toHaveBeenCalledWith(
        {},
        {
          start_date: undefined,
          end_date: undefined,
          domaine_fonctionnel: [],
          inclure_eig: 'false',
          lieu_de_survenue: [],
        },
        'national',
        expect.any(AbortSignal),
      );
    });

    it('rejects an unknown domaine fonctionnel', async () => {
      entitesMiddlewareState.topEntiteId = 'root-entite';

      const response = await client.dashboard.$get({ query: { domaineIds: 'SOCIAL,NOT_A_DOMAINE' } });

      expect(response.status).toBe(400);
      expect(fetchDashboardData).not.toHaveBeenCalled();
    });

    it('forwards the selected lieux de survenue (types et précisions) to Metabase as a repeatable array param', async () => {
      entitesMiddlewareState.topEntiteId = 'root-entite';
      vi.mocked(getEntiteById).mockResolvedValueOnce({ label: 'ARS Île-de-France' } as never);
      vi.mocked(fetchDashboardData).mockResolvedValueOnce({ tabs: [], cards: [] });

      const response = await client.dashboard.$get({
        query: { lieuTypes: 'ETABLISSEMENT_SANTE,DOMICILE:CHEZ_TIERS' },
      });

      expect(response.status).toBe(200);
      expect(fetchDashboardData).toHaveBeenCalledWith(
        { entity_label: 'ARS Île-de-France' },
        {
          start_date: undefined,
          end_date: undefined,
          domaine_fonctionnel: [],
          lieu_de_survenue: ['ETABLISSEMENT_SANTE', 'DOMICILE:CHEZ_TIERS'],
        },
        'local',
        expect.any(AbortSignal),
      );
    });

    it('rejects an unknown lieu de survenue', async () => {
      entitesMiddlewareState.topEntiteId = 'root-entite';

      const response = await client.dashboard.$get({ query: { lieuTypes: 'NOT_A_LIEU' } });

      expect(response.status).toBe(400);
      expect(fetchDashboardData).not.toHaveBeenCalled();
    });
  });
});
