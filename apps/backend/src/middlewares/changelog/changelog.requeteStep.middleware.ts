import type { ChangeLogAction } from '@/features/changelog/changelog.type';
import { getRequeteStateById } from '@/features/requeteStates/requeteStates.service';
import type { RequeteState } from '@/libs/prisma';
import createChangelogMiddleware from './changelog.middleware';

type requeteStatesChangelogMiddleware = {
  action: ChangeLogAction;
};

const requeteStatesChangelogMiddleware = ({ action }: requeteStatesChangelogMiddleware) =>
  createChangelogMiddleware<RequeteState>({
    action,
    entity: 'RequeteState',
    getEntityById: async (c) => {
      let id: string | null = null;
      if (c.get('changelogId')) {
        id = c.get('changelogId');
      } else if (c.req.param('id')) {
        id = c.req.param('id');
      }
      if (id) {
        return await getRequeteStateById(id);
      }
      return null;
    },
    getEntityId: (c) => {
      if (c.get('changelogId')) {
        return c.get('changelogId');
      }
      return c.req.param('id');
    },
    trackedFields: ['stepName', 'statutId'],
  });

export default requeteStatesChangelogMiddleware;
