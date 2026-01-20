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
    getEntityById: (c) => {
      const id = c.req.param('id');
      return getUserById(id, null, null);
    },
    getEntityId: (c) => c.req.param('id'),
    trackedFields: ['roleId', 'entiteId', 'statutId'],
  });

export default userChangelogMiddleware;
