import { getUserEntities } from '@/features/users/users.service';
import factoryWithRole from '@/helpers/factories/appWithRole';

const app = factoryWithRole.createMiddleware(async (c, next) => {
  const userId = c.get('userId');

  const entities = await getUserEntities(userId, null);
  c.set('entiteIds', entities ?? []);

  return next();
});

export default app;
