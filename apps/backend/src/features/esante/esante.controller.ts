import { ROLES } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi';
import factoryWithLogs from '../../helpers/factories/appWithLogs.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import roleMiddleware from '../../middlewares/role.middleware.js';
import userStatusMiddleware from '../../middlewares/userStatus.middleware.js';
import { getOrganizationsRoute, getPractionnersRoute } from './esante.route.js';
import { GetOrganizationsQuerySchema, GetPractionnersQuerySchema } from './esante.schema.js';
import { getOrganizations, getPractionners } from './esante.service.js';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(userStatusMiddleware)
  .use(roleMiddleware([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER]))

  .get('/practionners', getPractionnersRoute, zValidator('query', GetPractionnersQuerySchema), async (c) => {
    const query = c.req.valid('query');

    const data = await getPractionners({
      'name:contains': query.fullName,
      identifier: query.identifier,
    });

    return c.json({ data });
  })

  .get('/organizations', getOrganizationsRoute, zValidator('query', GetOrganizationsQuerySchema), async (c) => {
    const query = c.req.valid('query');
    const data = await getOrganizations({
      'name:contains': query.name,
      identifier: query.identifier,
      'address-postalcode:contains': query.addressPostalcode,
    });

    return c.json({ data });
  });

export default app;
