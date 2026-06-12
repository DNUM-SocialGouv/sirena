import { ROLES } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi';
import { z } from 'zod';
import factoryWithLogs from '../../helpers/factories/appWithLogs.js';
import { addSirecIdsToQueue } from '../../jobs/queues/sirecMigration.queue.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import roleMiddleware from '../../middlewares/role.middleware.js';
import userStatusMiddleware from '../../middlewares/userStatus.middleware.js';
import { fetchExistingSirecIds, fetchSirecIdsByServiceIds } from './sirecMigration.repository.js';

const byReclamationsSchema = z.object({
  sirecIds: z.array(z.number().int().positive()).min(1),
});

const byServicesSchema = z.object({
  serviceIds: z.array(z.number().int().positive()).min(1),
});

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(userStatusMiddleware)
  .use(roleMiddleware([ROLES.SUPER_ADMIN]))

  .post('/by-reclamations', zValidator('json', byReclamationsSchema), async (c) => {
    const { sirecIds } = c.req.valid('json');

    const existingIds = await fetchExistingSirecIds(sirecIds);
    const unknownIds = sirecIds.filter((id) => !existingIds.includes(id));
    if (unknownIds.length > 0) {
      return c.json({ unknownIds }, 422);
    }

    const queued = await addSirecIdsToQueue(sirecIds);
    return c.json({ queued });
  })

  .post('/by-services', zValidator('json', byServicesSchema), async (c) => {
    const { serviceIds } = c.req.valid('json');
    const ids = await fetchSirecIdsByServiceIds(serviceIds);
    const queued = await addSirecIdsToQueue(ids);
    return c.json({ queued, found: ids.length });
  });

export default app;
