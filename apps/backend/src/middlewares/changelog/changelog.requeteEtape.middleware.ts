import type { ChangeLogAction } from '../../features/changelog/changelog.type.js';
import { getRequeteEtapeById } from '../../features/requeteEtapes/requetesEtapes.service.js';
import type { RequeteEtape } from '../../libs/prisma.js';
import createChangelogMiddleware from './changelog.middleware.js';

type requeteEtapesChangelogMiddleware = {
  action: ChangeLogAction;
};

const requeteEtapesChangelogMiddleware = ({ action }: requeteEtapesChangelogMiddleware) =>
  createChangelogMiddleware<RequeteEtape>({
    action,
    entity: 'RequeteEtape',
    getEntityById: async (c) => {
      let id: string | null = null;
      if (c.get('changelogId')) {
        id = c.get('changelogId');
      } else {
        id = c.req.param('id') ?? null;
      }
      if (id) {
        return await getRequeteEtapeById(id);
      }
      return null;
    },
    getEntityId: (c) => {
      if (c.get('changelogId')) {
        return c.get('changelogId');
      }
      return c.req.param('id') ?? null;
    },
    trackedFields: ['nom', 'statutId'],
  });

export default requeteEtapesChangelogMiddleware;
