import { getEntiteAscendanteId } from '@/features/entites/entites.service';
import { getUserEntities } from '@/features/users/users.service';
import factoryWithRole from '@/helpers/factories/appWithRole';

const app = factoryWithRole.createMiddleware(async (c, next) => {
  const userId = c.get('userId');

  const entities = await getUserEntities(userId, null);
  const [firstEntity] = entities ?? [];
  const topEntiteId = firstEntity ? await getEntiteAscendanteId(firstEntity) : null;

  c.set('entiteIds', entities ?? []);
  c.set('topEntiteId', topEntiteId);

  return next();
});

export default app;
