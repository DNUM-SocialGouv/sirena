import { throwHTTPException401Unauthorized } from '@sirena/backend-utils/helpers';
import factoryWithLogs from '../../helpers/factories/appWithLogs.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import entitesMiddleware from '../../middlewares/entites.middleware.js';
import { getUserById } from '../users/users.service.js';
import { getProfileRoute } from './profile.route.js';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(entitesMiddleware)
  .get('/', getProfileRoute, async (c) => {
    const logger = c.get('logger');
    const userId = c.get('userId');
    const topEntiteId = c.get('topEntiteId');

    logger.info({ userId }, 'User profile requested');
    const user = await getUserById(userId, null, null);

    if (!user) {
      logger.error({ userId }, 'User not found in profile controller - authentication inconsistency');
      throwHTTPException401Unauthorized('Unauthorized, User not found', { res: c.res });
    }

    logger.info({ userId }, 'User profile retrieved successfully');
    return c.json({ data: { ...user, topEntiteId } }, 200);
  });

export default app;
