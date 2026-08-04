import { ROLES_READ } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi';
import factoryWithLogs from '../../helpers/factories/appWithLogs.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import roleMiddleware from '../../middlewares/role.middleware.js';
import userStatusMiddleware from '../../middlewares/userStatus.middleware.js';
import { getAddressesRoute } from './adresse.route.js';
import { GetAddressesQuerySchema } from './adresse.schema.js';
import { searchAddresses } from './adresse.service.js';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(userStatusMiddleware)
  .use(roleMiddleware([...ROLES_READ]))

  .get('/search', getAddressesRoute, zValidator('query', GetAddressesQuerySchema), async (c) => {
    const { q } = c.req.valid('query');
    const data = await searchAddresses(q);
    return c.json({ data });
  });

export default app;
