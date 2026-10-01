import { throwHTTPException403Forbidden, throwHTTPException404NotFound } from '@sirena/backend-utils/helpers';
import { ERROR_KIND, FEATURE_FLAGS, REQUETE_STATUT_TYPES, ROLES_READ, ROLES_WRITE } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi';
import { type EntiteScopedContext, requireTopEntiteId } from '../../helpers/context.js';
import factoryWithRole from '../../helpers/factories/appWithRole.js';
import { streamFileResponse, streamSafeFileResponse } from '../../helpers/file.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import entitesMiddleware from '../../middlewares/entites.middleware.js';
import roleMiddleware from '../../middlewares/role.middleware.js';
import userStatusMiddleware from '../../middlewares/userStatus.middleware.js';
import { hasFeature } from '../featureFlags/featureFlags.service.js';
import { getRequeteEntiteStatutId, hasAccessToRequete } from '../requetesEntite/requetesEntite.service.js';
import { FilesNotOwnedError, getRequeteMessageUploadedFile } from '../uploadedFiles/uploadedFiles.service.js';
import {
  getRequeteMessagesRoute,
  getUnreadCountRoute,
  markMessagesReadRoute,
  postRequeteMessageRoute,
} from './requeteMessages.route.js';
import { GetRequeteMessagesQuerySchema, PostRequeteMessageBodySchema } from './requeteMessages.schema.js';
import {
  createRequeteMessage,
  getRequeteMessages,
  getUnreadCount,
  markAllMessagesAsRead,
} from './requeteMessages.service.js';

type DiscussionContext = EntiteScopedContext;

const isDiscussionEnabled = (c: DiscussionContext): Promise<boolean> => {
  const user = c.get('user');
  return hasFeature(FEATURE_FLAGS.REQUETE_DISCUSSION, false, user.email, user.entiteId);
};

const assertDiscussionAccess = async (c: DiscussionContext, requeteId: string): Promise<string> => {
  const topEntiteId = requireTopEntiteId(c);

  if (!(await isDiscussionEnabled(c))) {
    throwHTTPException404NotFound('Requete not found', { res: c.res, kind: ERROR_KIND.BUSINESS });
  }

  if (!(await hasAccessToRequete({ requeteId, entiteId: topEntiteId }))) {
    throwHTTPException404NotFound('Requete not found', { res: c.res, kind: ERROR_KIND.BUSINESS });
  }

  return topEntiteId;
};

const app = factoryWithRole
  .createApp()
  .use(authMiddleware)
  .use(roleMiddleware([...ROLES_READ]))
  .use(userStatusMiddleware)
  .use(entitesMiddleware)

  .get('/:requeteId', getRequeteMessagesRoute, zValidator('query', GetRequeteMessagesQuerySchema), async (c) => {
    const { requeteId } = c.req.param();
    await assertDiscussionAccess(c, requeteId);

    const { data, meta } = await getRequeteMessages(requeteId, c.get('userId'), c.req.valid('query'));

    c.get('logger').info({ requeteId, count: data.length }, 'Requete messages retrieved');

    return c.json({ data, meta });
  })

  .get('/:requeteId/unread-count', getUnreadCountRoute, async (c) => {
    const { requeteId } = c.req.param();
    await assertDiscussionAccess(c, requeteId);

    const unreadCount = await getUnreadCount(requeteId, c.get('userId'));

    return c.json({ data: { unreadCount } });
  })

  .post('/:requeteId/read', markMessagesReadRoute, async (c) => {
    const { requeteId } = c.req.param();
    const topEntiteId = await assertDiscussionAccess(c, requeteId);
    const userId = c.get('userId');

    const { markedIds, unreadCount } = await markAllMessagesAsRead(requeteId, userId, topEntiteId);

    c.get('logger').info({ requeteId, userId, markedCount: markedIds.length }, 'Requete messages marked as read');

    return c.json({ data: { unreadCount } });
  })

  .get('/:requeteId/file/:fileId', async (c) => {
    const { requeteId, fileId } = c.req.param();
    await assertDiscussionAccess(c, requeteId);

    const file = await getRequeteMessageUploadedFile(requeteId, fileId);
    if (!file) {
      throwHTTPException404NotFound('File not found', { res: c.res, kind: ERROR_KIND.BUSINESS });
    }

    c.get('logger').info({ requeteId, fileId }, 'Retrieving file for requete message');

    return streamFileResponse(c, file);
  })

  .get('/:requeteId/file/:fileId/safe', async (c) => {
    const { requeteId, fileId } = c.req.param();
    await assertDiscussionAccess(c, requeteId);

    const file = await getRequeteMessageUploadedFile(requeteId, fileId);
    if (!file) {
      throwHTTPException404NotFound('File not found', { res: c.res, kind: ERROR_KIND.BUSINESS });
    }

    if (!file.safeFilePath) {
      throwHTTPException404NotFound('Safe file not available', { res: c.res, kind: ERROR_KIND.BUSINESS });
    }

    c.get('logger').info({ requeteId, fileId }, 'Retrieving safe file for requete message');

    return streamSafeFileResponse(c, file);
  })

  .use(roleMiddleware([...ROLES_WRITE]))

  .post('/:requeteId', postRequeteMessageRoute, zValidator('json', PostRequeteMessageBodySchema), async (c) => {
    const { requeteId } = c.req.param();
    const topEntiteId = await assertDiscussionAccess(c, requeteId);
    const userId = c.get('userId');

    const statutId = await getRequeteEntiteStatutId({ requeteId, entiteId: topEntiteId });
    if (statutId === REQUETE_STATUT_TYPES.CLOTUREE) {
      throwHTTPException403Forbidden('La requête est clôturée pour votre entité.', {
        res: c.res,
        kind: ERROR_KIND.BUSINESS,
      });
    }

    try {
      const message = await createRequeteMessage(requeteId, topEntiteId, userId, c.req.valid('json'), c.get('logger'));

      c.get('logger').info({ requeteId, messageId: message?.id, userId }, 'Requete message created');

      return c.json({ data: message }, 201);
    } catch (error) {
      if (error instanceof FilesNotOwnedError) {
        throwHTTPException403Forbidden('You are not allowed to add these files', {
          res: c.res,
          kind: ERROR_KIND.BUSINESS,
        });
      }
      throw error;
    }
  });

export default app;
