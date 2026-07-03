import { getEntiteAscendanteInfo } from '../features/entites/entites.service.js';
import { getUserById, getUserEntities } from '../features/users/users.service.js';
import factoryWithRole from '../helpers/factories/appWithRole.js';

const app = factoryWithRole.createMiddleware(async (c, next) => {
  const userId = c.get('userId');

  const user = await getUserById(userId, null, null);
  const entities = await getUserEntities(userId, null);
  const assignedEntiteId = user?.entiteId ?? null;
  const ascendant = assignedEntiteId ? await getEntiteAscendanteInfo(assignedEntiteId) : null;

  c.set('entiteIds', entities);
  c.set('assignedEntiteId', assignedEntiteId);
  c.set('topEntiteId', ascendant?.entiteId ?? null);
  c.set('entiteIdLevel', ascendant?.level ?? null);

  return next();
});

export default app;
