import { ROLES } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi/zod';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import authMiddleware from '@/middlewares/auth.middleware';
import roleMiddleware from '@/middlewares/role.middleware';
import userStatusMiddleware from '@/middlewares/userStatus.middleware';
import { getPractionnersRoute } from './esante.route';
import { GetPractionnersQuerySchema } from './esante.schema';
import { getPractionners } from './esante.service';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(userStatusMiddleware)
  .use(roleMiddleware([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER]))

  .get('/practionners', getPractionnersRoute, zValidator('query', GetPractionnersQuerySchema), async (c) => {
    const query = c.req.valid('query');

    const data = await getPractionners({ 'given:contains': query.fullName, identifier: query.rpps });

    return c.json({ data });
  });

export default app;
