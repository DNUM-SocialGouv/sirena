import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { pinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../helpers/errors.js';
import appWithLogs from '../../helpers/factories/appWithLogs.js';
import { createSSEStream, type FileStatusEvent, type UserListEvent } from '../../helpers/sse.js';
import entitesMiddleware from '../../middlewares/entites.middleware.js';
import { hasAccessToRequete } from '../requetesEntite/requetesEntite.service.js';
import { getUploadedFileById } from '../uploadedFiles/uploadedFiles.service.js';
import SSEController, { buildUserListFilter } from './sse.controller.js';

vi.mock('../../config/env.js', () => ({
  envVars: {
    SENTRY_ENABLED: false,
  },
}));

vi.mock('../../helpers/sse.js', () => {
  const createSSEStream = vi.fn(
    (c: Context, _options: { eventType: string; filter?: unknown; closeOnUserStatusChange?: boolean }) =>
      c.body('', 200, { 'Content-Type': 'text/event-stream' }),
  );

  return {
    createSSEStream,
    createSSEHandler:
      (config: { eventType: string; getFilter: (c: Context) => unknown; closeOnUserStatusChange?: boolean }) =>
      (c: Context) =>
        createSSEStream(c, {
          eventType: config.eventType,
          filter: config.getFilter(c),
          closeOnUserStatusChange: config.closeOnUserStatusChange,
        }),
    requireTopEntiteId: (c: Context) => c.get('topEntiteId'),
    requireUserId: (c: Context) => c.get('userId'),
    sseEventManager: { emitRequeteUpdated: vi.fn() },
  };
});

vi.mock('../requetesEntite/requetesEntite.service.js', () => ({
  hasAccessToRequete: vi.fn(),
  getRequeteEntiteById: vi.fn(),
}));

vi.mock('../uploadedFiles/uploadedFiles.service.js', () => ({
  getUploadedFileById: vi.fn(),
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
  default: () => (c: Context, next: Next) => {
    c.set('roleId', 'ENTITY_ADMIN');
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

describe('sse.controller.ts', () => {
  const app = appWithLogs.createApp().use(pinoLogger()).route('/', SSEController).onError(errorHandler);
  const client = testClient(app);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasAccessToRequete).mockResolvedValue(true);
  });

  const streamOptions = <T>() =>
    vi.mocked(createSSEStream).mock.calls[0]?.[1] as {
      filter?: (event: T) => boolean;
      closeOnUserStatusChange?: boolean;
    };

  describe('GET /profile', () => {
    it('stays open on a status change: an inactive account learns about its reactivation here', async () => {
      const res = await client.profile.$get();

      expect(res.status).toBe(200);
      expect(streamOptions().closeOnUserStatusChange).toBe(false);
    });
  });

  describe('GET /users', () => {
    const listEvent = (entiteId: string | null): UserListEvent => ({ action: 'updated', userId: 'u', entiteId });

    it('closes on a status or role change of the subscriber, like every other stream', async () => {
      await client.users.$get();

      expect(streamOptions().closeOnUserStatusChange).toBeUndefined();
    });

    it('scopes an ENTITY_ADMIN to the users of their entity and its descendants, as GET /users does', async () => {
      const res = await client.users.$get();

      expect(res.status).toBe(200);
      const { filter } = streamOptions<UserListEvent>();
      if (!filter) throw new Error('expected a filter');
      expect(filter(listEvent('e1'))).toBe(true);
      expect(filter(listEvent('e2'))).toBe(true);
      expect(filter(listEvent('other-entity'))).toBe(false);
      // A user without entity is out of the REST list of an ENTITY_ADMIN too.
      expect(filter(listEvent(null))).toBe(false);
    });

    it('lets a SUPER_ADMIN follow every user', async () => {
      vi.mocked(entitesMiddleware).mockImplementationOnce((c: Context, next: Next) => {
        c.set('entiteIds', null);
        c.set('topEntiteId', null);
        return next();
      });

      const res = await client.users.$get();

      expect(res.status).toBe(200);
      expect(streamOptions().filter).toBeUndefined();
    });
  });

  describe('buildUserListFilter()', () => {
    it('returns no filter for a SUPER_ADMIN scope', () => {
      expect(buildUserListFilter(null)).toBeUndefined();
    });

    it('lets nothing through for an ENTITY_ADMIN without entity', () => {
      const filter = buildUserListFilter([]);
      expect(filter?.({ action: 'created', userId: 'u', entiteId: 'e1' })).toBe(false);
      expect(filter?.({ action: 'created', userId: 'u', entiteId: null })).toBe(false);
    });
  });

  describe('GET /requetes/:id', () => {
    it('checks the access with a single lookup instead of loading the requete graph', async () => {
      const res = await client.requetes[':id'].$get({ param: { id: 'REQ' } });

      expect(res.status).toBe(200);
      expect(hasAccessToRequete).toHaveBeenCalledWith({ requeteId: 'REQ', entiteId: 'e1' });
    });

    it('returns 404 when the entity is not affected to the requete', async () => {
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(false);

      const res = await client.requetes[':id'].$get({ param: { id: 'REQ' } });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /files/:id', () => {
    it('opens the stream for a file of the subscriber entity and filters on both ids', async () => {
      vi.mocked(getUploadedFileById).mockResolvedValueOnce({ id: 'F1', entiteId: 'e1' } as never);

      const res = await client.files[':id'].$get({ param: { id: 'F1' } });

      expect(res.status).toBe(200);
      expect(getUploadedFileById).toHaveBeenCalledWith('F1', ['e1']);
      const options = vi.mocked(createSSEStream).mock.calls[0]?.[1] as { filter: (event: FileStatusEvent) => boolean };
      expect(options.filter({ fileId: 'F1', entiteId: 'e1', status: 'x', scanStatus: 'x', sanitizeStatus: 'x' })).toBe(
        true,
      );
      expect(options.filter({ fileId: 'F1', entiteId: 'e2', status: 'x', scanStatus: 'x', sanitizeStatus: 'x' })).toBe(
        false,
      );
    });

    it('returns 404 for a file the entity has no access to', async () => {
      vi.mocked(getUploadedFileById).mockResolvedValueOnce(null);

      const res = await client.files[':id'].$get({ param: { id: 'F1' } });

      expect(res.status).toBe(404);
    });
  });
});
