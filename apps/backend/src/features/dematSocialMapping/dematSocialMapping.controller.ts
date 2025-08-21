import { throwHTTPException404NotFound } from '@sirena/backend-utils/helpers';
import { ROLES } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi/zod';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import { isOperationDependsOnRecordNotFoundError } from '@/helpers/prisma';
import authMiddleware from '@/middlewares/auth.middleware';
import roleMiddleware from '@/middlewares/role.middleware';
import userStatusMiddleware from '@/middlewares/userStatus.middleware';
import {
  getDematSocialMappingRoute,
  getDematSocialMappingsRoute,
  patchDematSocialMappingRoute,
} from './dematSocialMapping.route';
import { GetDematSocialMappingsQuerySchema, PatchUserSchema } from './dematSocialMapping.schema';
import {
  getDematSocialMappingById,
  getDematSocialMappings,
  patchDematSocialMapping,
} from './dematSocialMapping.service';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(userStatusMiddleware)
  .use(roleMiddleware([ROLES.SUPER_ADMIN]))

  .get('/', getDematSocialMappingsRoute, zValidator('query', GetDematSocialMappingsQuerySchema), async (c) => {
    const logger = c.get('logger');
    const { sort, order, offset, limit, search } = c.req.valid('query');

    logger.info({ sort, order, offset, limit, search }, 'DematSocial mappings list requested');
    const { data, total } = await getDematSocialMappings({ sort, order, offset, limit, search });
    logger.info({ mappingCount: data.length, total }, 'DematSocial mappings list retrieved successfully');

    return c.json(
      {
        data,
        meta: {
          ...(offset !== undefined && { offset }),
          ...(limit !== undefined && { limit }),
          total,
        },
      },
      200,
    );
  })

  .get('/:id', getDematSocialMappingRoute, async (c) => {
    const logger = c.get('logger');
    const id = c.req.param('id');

    logger.info({ mappingId: id }, 'DematSocial mapping details requested');
    const dematSocialMapping = await getDematSocialMappingById(id);
    if (!dematSocialMapping) {
      throwHTTPException404NotFound('DematSocialMapping not found', {
        res: c.res,
      });
    }

    logger.info({ mappingId: id }, 'DematSocial mapping details retrieved successfully');
    return c.json({ data: dematSocialMapping }, 200);
  })

  .patch('/:id', patchDematSocialMappingRoute, zValidator('json', PatchUserSchema), async (c) => {
    const logger = c.get('logger');
    const json = c.req.valid('json');
    const id = c.req.param('id');

    logger.info({ mappingId: id, updatedFields: Object.keys(json) }, 'DematSocial mapping update requested');

    try {
      const dematSocialMapping = await patchDematSocialMapping(id, json);
      logger.info({ mappingId: id }, 'DematSocial mapping updated successfully');
      return c.json({ data: dematSocialMapping }, 200);
    } catch (error) {
      if (isOperationDependsOnRecordNotFoundError(error)) {
        throwHTTPException404NotFound('DematSocialMapping not found', {
          res: c.res,
        });
      } else {
        throw error;
      }
    }
  });

export default app;
