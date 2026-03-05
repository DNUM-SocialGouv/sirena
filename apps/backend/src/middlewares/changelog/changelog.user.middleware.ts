import type { ChangeLogAction } from '../../features/changelog/changelog.type.js';
import { getUserById } from '../../features/users/users.service.js';
import type { User } from '../../libs/prisma.js';
import createChangelogMiddleware from './changelog.middleware.js';

type UserChangelogMiddleware = {
  action: ChangeLogAction;
};

const userChangelogMiddleware = ({ action }: UserChangelogMiddleware) =>
  createChangelogMiddleware<User>({
    entity: 'User',
    action,
    getEntityById: async (c) => {
      const id = c.req.param('id') ?? null;
      if (!id) {
        return null;
      }
      return await getUserById(id, null, null);
    },
    getEntityId: (c) => c.req.param('id') ?? null,
    trackedFields: ['roleId', 'entiteId', 'statutId'],
  });

export default userChangelogMiddleware;
