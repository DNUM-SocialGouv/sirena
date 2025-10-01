import { throwHTTPException401Unauthorized } from '@sirena/backend-utils/helpers';
import { ROLES } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi/zod';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import authMiddleware from '@/middlewares/auth.middleware';
import entitesMiddleware from '@/middlewares/entites.middleware';
import roleMiddleware from '@/middlewares/role.middleware';
import userStatusMiddleware from '@/middlewares/userStatus.middleware';
import { getUserById } from '../users/users.service';
import { getRequetesEntiteRoute } from './requetesEntite.route';
import { GetRequetesEntiteQuerySchema } from './requetesEntite.schema';
import { createRequeteEntite, getRequetesEntite } from './requetesEntite.service';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(userStatusMiddleware)
  .use(roleMiddleware([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.READER, ROLES.WRITER]))
  .use(entitesMiddleware)

  .get('/', getRequetesEntiteRoute, zValidator('query', GetRequetesEntiteQuerySchema), async (c) => {
    const logger = c.get('logger');
    const query = c.req.valid('query');
    // const entiteIds = c.get('entiteIds');
    // TODO Use real entiteIds when implemented
    const { data, total } = await getRequetesEntite(null, query);

    logger.info({ requestCount: data.length, total }, 'Requetes entite list retrieved successfully');

    return c.json({
      data,
      meta: {
        ...(query.offset !== undefined && { offset: query.offset }),
        ...(query.limit !== undefined && { limit: query.limit }),
        total,
      },
    });
  })

  // Roles with edit permissions
  .use(roleMiddleware([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER]))

  // TODO: useful to validate ticket SIRENA-223, should be removed later
  .post('/', async (c) => {
    const logger = c.get('logger');
    const userId = c.get('userId');

    const user = await getUserById(userId, null, null);
    if (!user?.entiteId) {
      return throwHTTPException401Unauthorized('User not found or not associated with entity', {
        res: c.res,
      });
    }

    const requete = await createRequeteEntite(user.entiteId);

    logger.info({ requeteId: requete.id, userId }, 'New requete created successfully');

    return c.json({ data: requete }, 201);
  });

export default app;
