import { getEntiteAscendanteInfo } from '../features/entites/entites.service.js';
import { getUserEntiteContext } from '../features/users/users.service.js';
import factoryWithRole from '../helpers/factories/appWithRole.js';

const app = factoryWithRole.createMiddleware(async (c, next) => {
  const userId = c.get('userId');

  const { assignedEntiteId, entiteIds } = await getUserEntiteContext(userId);
  const ascendant = assignedEntiteId ? await getEntiteAscendanteInfo(assignedEntiteId) : null;

  c.set('entiteIds', entiteIds);
  c.set('assignedEntiteId', assignedEntiteId);
  c.set('topEntiteId', ascendant?.entiteId ?? null);
  c.set('entiteIdLevel', ascendant?.level ?? null);

  return next();
});

export default app;
