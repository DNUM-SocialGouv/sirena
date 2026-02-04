import { getEntiteAscendanteInfo } from '../features/entites/entites.service.js';
import { getUserEntities } from '../features/users/users.service.js';
import factoryWithRole from '../helpers/factories/appWithRole.js';

const app = factoryWithRole.createMiddleware(async (c, next) => {
  const userId = c.get('userId');

  const entities = await getUserEntities(userId, null);
  const [firstEntity] = entities ?? [];
  const ascendant = firstEntity ? await getEntiteAscendanteInfo(firstEntity) : null;

  c.set('entiteIds', entities);
  c.set('topEntiteId', ascendant?.entiteId ?? null);
  c.set('entiteIdLevel', ascendant?.level ?? null);

  return next();
});

export default app;
