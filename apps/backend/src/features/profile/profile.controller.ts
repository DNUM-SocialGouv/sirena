import { throwHTTPException401Unauthorized } from '@sirena/backend-utils/helpers';
import { getUserById } from '@/features/users/users.service';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import authMiddleware from '@/middlewares/auth.middleware';
import { getProfileRoute } from './profile.route';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)

  .get('/', getProfileRoute, async (c) => {
    const userId = c.get('userId');
    const user = await getUserById(userId, null);
    if (!user) {
      // never should happen
      const logger = c.get('logger');
      logger.error(`User with ID ${userId} not found in profile controller.`);
      throwHTTPException401Unauthorized('Unauthorized, User not found', { res: c.res });
    }
    return c.json({ data: user }, 200);
  });

export default app;
