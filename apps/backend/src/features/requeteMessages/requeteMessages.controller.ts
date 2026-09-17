import { throwHTTPException404NotFound } from '@sirena/backend-utils/helpers';
import { ERROR_KIND, FEATURE_FLAGS, ROLES_READ } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi';
import { type EntiteScopedContext, requireTopEntiteId } from '../../helpers/context.js';
import factoryWithRole from '../../helpers/factories/appWithRole.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import entitesMiddleware from '../../middlewares/entites.middleware.js';
import roleMiddleware from '../../middlewares/role.middleware.js';
import userStatusMiddleware from '../../middlewares/userStatus.middleware.js';
import { hasFeature } from '../featureFlags/featureFlags.service.js';
import { hasAccessToRequete } from '../requetesEntite/requetesEntite.service.js';
import { getRequeteMessagesRoute, markMessagesReadRoute } from './requeteMessages.route.js';
import { GetRequeteMessagesQuerySchema } from './requeteMessages.schema.js';
import { getRequeteMessages, markAllMessagesAsRead } from './requeteMessages.service.js';

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

  .post('/:requeteId/read', markMessagesReadRoute, async (c) => {
    const { requeteId } = c.req.param();
    const topEntiteId = await assertDiscussionAccess(c, requeteId);
    const userId = c.get('userId');

    const { markedIds, unreadCount } = await markAllMessagesAsRead(requeteId, userId, topEntiteId);

    c.get('logger').info({ requeteId, userId, markedCount: markedIds.length }, 'Requete messages marked as read');

    return c.json({ data: { unreadCount } });
  });

export default app;
