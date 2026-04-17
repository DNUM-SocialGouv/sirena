import { throwHTTPException404NotFound } from '@sirena/backend-utils/helpers';
import { ROLES } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi';
import factoryWithLogs from '../../helpers/factories/appWithLogs.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import roleMiddleware from '../../middlewares/role.middleware.js';
import userStatusMiddleware from '../../middlewares/userStatus.middleware.js';
import { getUserById } from '../users/users.service.js';
import {
  createFeatureFlagRoute,
  deleteFeatureFlagRoute,
  getFeatureFlagsRoute,
  patchFeatureFlagRoute,
  resolveFeatureFlagsRoute,
} from './featureFlags.route.js';
import { CreateFeatureFlagSchema, PatchFeatureFlagSchema } from './featureFlags.schema.js';
import {
  createFeatureFlag,
  deleteFeatureFlag,
  getFeatureFlagById,
  getFeatureFlags,
  patchFeatureFlag,
  resolveFeatureFlags,
} from './featureFlags.service.js';

const resolveApp = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(userStatusMiddleware)
  .get('/resolve', resolveFeatureFlagsRoute, async (c) => {
    const userId = c.get('userId');
    const user = await getUserById(userId, null, null);
    const data = await resolveFeatureFlags(user?.email ?? '', user?.entiteId ?? null);
    return c.json({ data });
  });

const adminApp = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(userStatusMiddleware)
  .use(roleMiddleware([ROLES.SUPER_ADMIN]))

  .get('/', getFeatureFlagsRoute, async (c) => {
    const data = await getFeatureFlags();
    return c.json({ data });
  })

  .post('/', createFeatureFlagRoute, zValidator('json', CreateFeatureFlagSchema), async (c) => {
    const logger = c.get('logger');
    const body = c.req.valid('json');
    const data = await createFeatureFlag(body);
    logger.info({ featureFlagId: data.id, name: data.name }, 'Feature flag created');
    return c.json({ data }, 201);
  })

  .patch('/:id', patchFeatureFlagRoute, zValidator('json', PatchFeatureFlagSchema), async (c) => {
    const logger = c.get('logger');
    const id = c.req.param('id');

    const existing = await getFeatureFlagById(id);
    if (!existing) {
      throwHTTPException404NotFound('Feature flag not found', { res: c.res });
    }

    const body = c.req.valid('json');
    const data = await patchFeatureFlag(id, body);
    logger.info({ featureFlagId: id, name: data.name }, 'Feature flag updated');
    return c.json({ data });
  })

  .delete('/:id', deleteFeatureFlagRoute, async (c) => {
    const logger = c.get('logger');
    const id = c.req.param('id');

    const existing = await getFeatureFlagById(id);
    if (!existing) {
      throwHTTPException404NotFound('Feature flag not found', { res: c.res });
    }

    await deleteFeatureFlag(id);
    logger.info({ featureFlagId: id, name: existing.name }, 'Feature flag deleted');
    return c.body(null, 204);
  });

const app = factoryWithLogs.createApp().route('/', resolveApp).route('/', adminApp);

export default app;
