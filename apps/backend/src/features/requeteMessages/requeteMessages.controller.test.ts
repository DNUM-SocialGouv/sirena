import { ERROR_KIND, ROLES } from '@sirena/common/constants';
import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { pinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../helpers/errors.js';
import appWithLogs from '../../helpers/factories/appWithLogs.js';
import entitesMiddleware from '../../middlewares/entites.middleware.js';
import { hasFeature } from '../featureFlags/featureFlags.service.js';
import { hasAccessToRequete } from '../requetesEntite/requetesEntite.service.js';
import RequeteMessagesController from './requeteMessages.controller.js';
import { getRequeteMessages, markAllMessagesAsRead } from './requeteMessages.service.js';

const roleState = vi.hoisted(() => ({ current: 'ENTITY_ADMIN' as string }));

vi.mock('../../config/env.js', () => ({
  envVars: {
    SENTRY_ENABLED: false,
  },
}));

vi.mock('./requeteMessages.service.js', () => ({
  getRequeteMessages: vi.fn(),
  markAllMessagesAsRead: vi.fn(),
}));

vi.mock('../featureFlags/featureFlags.service.js', () => ({
  hasFeature: vi.fn(),
}));

vi.mock('../requetesEntite/requetesEntite.service.js', () => ({
  hasAccessToRequete: vi.fn(),
}));

vi.mock('../../middlewares/auth.middleware.js', () => ({
  default: (c: Context, next: Next) => {
    c.set('userId', 'test-user-id');
    return next();
  },
}));

vi.mock('../../middlewares/userStatus.middleware.js', () => ({
  default: (c: Context, next: Next) => {
    c.set('user', { email: 'agent@example.test', entiteId: 'e1' });
    return next();
  },
}));

vi.mock('../../middlewares/role.middleware.js', () => ({
  default: (allowedRoles: readonly string[]) => (c: Context, next: Next) => {
    if (!allowedRoles.includes(roleState.current)) {
      return c.json({ message: 'Forbidden' }, 403);
    }
    c.set('roleId', roleState.current);
    return next();
  },
}));

vi.mock('../../middlewares/entites.middleware.js', () => ({
  default: vi.fn((c: Context, next: Next) => {
    c.set('entiteIds', ['e1', 'e2']);
    c.set('topEntiteId', 'e1');
    return next();
  }),
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

const REQUETE_ID = 'REQ';
const MESSAGE_ID = '11111111-1111-4111-8111-111111111111';

const fakeMessage = {
  id: MESSAGE_ID,
  requeteId: REQUETE_ID,
  contenu: 'Bonjour',
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  entite: { id: 'e1', nomComplet: 'ARS', entiteTypeId: 'ARS' },
  author: { prenom: 'Jean', nom: 'Dupont' },
  isReadByCurrentUser: true,
};

const withoutTopEntiteId = () => {
  vi.mocked(entitesMiddleware).mockImplementationOnce((c: Context, next: Next) => {
    c.set('topEntiteId', null);
    return next();
  });
};

describe('requeteMessages.controller.ts', () => {
  const app = appWithLogs.createApp().use(pinoLogger()).route('/', RequeteMessagesController).onError(errorHandler);
  const client = testClient(app);

  beforeEach(() => {
    vi.clearAllMocks();
    roleState.current = ROLES.ENTITY_ADMIN;
    vi.mocked(hasFeature).mockResolvedValue(true);
    vi.mocked(hasAccessToRequete).mockResolvedValue(true);
    vi.mocked(getRequeteMessages).mockResolvedValue({
      data: [fakeMessage],
      meta: { hasMore: false, nextCursor: null },
    } as unknown as Awaited<ReturnType<typeof getRequeteMessages>>);
    vi.mocked(markAllMessagesAsRead).mockResolvedValue({ markedIds: [MESSAGE_ID], unreadCount: 0 });
  });

  describe('GET /:requeteId', () => {
    it('lists the messages of the requete for the current user', async () => {
      const res = await client[':requeteId'].$get({ param: { requeteId: REQUETE_ID }, query: {} });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(getRequeteMessages).toHaveBeenCalledWith(REQUETE_ID, 'test-user-id', { limit: 50 });
      expect(body).toEqual({
        data: [{ ...fakeMessage, createdAt: fakeMessage.createdAt.toISOString() }],
        meta: { hasMore: false, nextCursor: null },
      });
    });

    it('returns 400 when the user has no root entity', async () => {
      withoutTopEntiteId();

      const res = await client[':requeteId'].$get({ param: { requeteId: REQUETE_ID }, query: {} });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({
        message: 'You are not allowed to read requetes without topEntiteId.',
        cause: { kind: ERROR_KIND.BUSINESS },
      });
      expect(getRequeteMessages).not.toHaveBeenCalled();
    });

    it('hides the requete behind a 404 when the feature flag is disabled', async () => {
      vi.mocked(hasFeature).mockResolvedValueOnce(false);

      const res = await client[':requeteId'].$get({ param: { requeteId: REQUETE_ID }, query: {} });

      expect(res.status).toBe(404);
      expect(getRequeteMessages).not.toHaveBeenCalled();
    });

    it('hides the requete behind a 404 when the entity is not affected to it', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client[':requeteId'].$get({ param: { requeteId: REQUETE_ID }, query: {} });

      expect(res.status).toBe(404);
      expect(getRequeteMessages).not.toHaveBeenCalled();
    });

    it.each([
      ['a limit below the minimum', { limit: '0' }],
      ['a limit above the maximum', { limit: '101' }],
      ['a cursor that is not a uuid', { before: 'not-a-uuid' }],
    ])('rejects %s with a 400', async (_label, query) => {
      const res = await client[':requeteId'].$get({ param: { requeteId: REQUETE_ID }, query });

      expect(res.status).toBe(400);
      expect(getRequeteMessages).not.toHaveBeenCalled();
    });
  });

  describe('POST /:requeteId/read', () => {
    it('marks every message of the requete as read and returns the refreshed unread count', async () => {
      const res = await client[':requeteId'].read.$post({ param: { requeteId: REQUETE_ID } });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ data: { unreadCount: 0 } });
      expect(markAllMessagesAsRead).toHaveBeenCalledWith(REQUETE_ID, 'test-user-id', 'e1');
    });

    it('is allowed to a reader', async () => {
      roleState.current = ROLES.READER;

      const res = await client[':requeteId'].read.$post({ param: { requeteId: REQUETE_ID } });

      expect(res.status).toBe(200);
      expect(markAllMessagesAsRead).toHaveBeenCalledOnce();
    });

    it('returns 404 when the entity is not affected to the requete', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client[':requeteId'].read.$post({ param: { requeteId: REQUETE_ID } });

      expect(res.status).toBe(404);
      expect(markAllMessagesAsRead).not.toHaveBeenCalled();
    });
  });
});
