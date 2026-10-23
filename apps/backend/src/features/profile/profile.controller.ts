import { throwHTTPException401Unauthorized, throwHTTPException409Conflict } from '@sirena/backend-utils/helpers';
import { CGU_VERSION, ERROR_KIND } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi';
import factoryWithLogs from '../../helpers/factories/appWithLogs.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import entitesMiddleware from '../../middlewares/entites.middleware.js';
import { getDepartementsByRegionCode, getEntiteChain, getEntitesByIds } from '../entites/entites.service.js';
import { getUserById } from '../users/users.service.js';
import { getProfileRoute, postCguAcceptanceRoute } from './profile.route.js';
import { CguAcceptanceBodySchema } from './profile.schema.js';
import { acceptCgu } from './profile.service.js';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(entitesMiddleware)
  .get('/', getProfileRoute, async (c) => {
    const logger = c.get('logger');
    const userId = c.get('userId');
    const topEntiteId = c.get('topEntiteId');
    const entiteIds = c.get('entiteIds') || [];
    const entiteIdLevel = c.get('entiteIdLevel');

    logger.info({ userId }, 'User profile requested');
    const user = await getUserById(userId, null, null);

    if (!user) {
      logger.error({ userId }, 'User not found in profile controller - authentication inconsistency');
      throwHTTPException401Unauthorized('Unauthorized, User not found', { res: c.res });
    }

    const [topEntite] = topEntiteId ? await getEntitesByIds([topEntiteId]) : [];
    const topEntiteIsActive = topEntite?.isActive ?? null;
    const topEntiteTypeId = topEntite?.entiteTypeId ?? null;
    const topEntiteRegionLabel = topEntite?.regLib ?? null;
    const topEntiteDepartements =
      topEntite?.entiteTypeId === 'ARS' && topEntite.regionCode
        ? await getDepartementsByRegionCode(topEntite.regionCode)
        : null;

    const affectationChain =
      user.entiteId != null
        ? (await getEntiteChain(user.entiteId)).map((e) => ({ id: e.id, nomComplet: e.nomComplet }))
        : [];

    logger.info({ userId }, 'User profile retrieved successfully');
    return c.json(
      {
        data: {
          ...user,
          topEntiteId,
          topEntiteTypeId,
          topEntiteIsActive,
          topEntiteRegionLabel,
          topEntiteDepartements,
          entiteIds,
          entiteIdLevel,
          affectationChain,
        },
      },
      200,
    );
  })

  .post('/cgu-acceptance', postCguAcceptanceRoute, zValidator('json', CguAcceptanceBodySchema), async (c) => {
    const logger = c.get('logger');
    const userId = c.get('userId');
    const { version } = c.req.valid('json');

    // A page loaded before a new CGU version was published shows the previous text: its acceptance must not count
    if (version !== CGU_VERSION) {
      logger.warn({ userId, version }, 'Outdated CGU version acceptance refused');
      throwHTTPException409Conflict('Outdated CGU version', { res: c.res, kind: ERROR_KIND.BUSINESS });
    }

    const acceptance = await acceptCgu(userId, version);

    logger.info({ userId, version }, 'CGU accepted');
    return c.json({ data: acceptance }, 200);
  });

export default app;
