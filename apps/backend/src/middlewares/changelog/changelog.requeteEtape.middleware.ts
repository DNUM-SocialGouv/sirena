import type { ChangeLogAction } from '@/features/changelog/changelog.type';
import { getRequeteEtapeById } from '@/features/requeteEtapes/requetesEtapes.service';
import type { RequeteEtape } from '@/libs/prisma';
import createChangelogMiddleware from './changelog.middleware';

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
      } else if (c.req.param('id')) {
        id = c.req.param('id');
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
      return c.req.param('id');
    },
    trackedFields: ['nom', 'statutId'],
  });

export default requeteEtapesChangelogMiddleware;
