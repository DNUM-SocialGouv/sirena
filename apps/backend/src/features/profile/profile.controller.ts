import { throwHTTPException401Unauthorized } from '@sirena/backend-utils/helpers';
import { getUserById } from '@/features/users/users.service';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import authMiddleware from '@/middlewares/auth.middleware';
import { getProfileRoute } from './profile.route';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)

  .get('/', getProfileRoute, async (c) => {
    const logger = c.get('logger');
    const userId = c.get('userId');

    logger.info({ userId }, 'User profile requested');
    const user = await getUserById(userId, null);

    if (!user) {
      logger.error({ userId }, 'User not found in profile controller - authentication inconsistency');
      throwHTTPException401Unauthorized('Unauthorized, User not found', { res: c.res });
    }

    logger.info({ userId }, 'User profile retrieved successfully');
    return c.json({ data: user }, 200);
  });

export default app;
