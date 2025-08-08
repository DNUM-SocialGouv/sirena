import type { ChangeLogAction } from '@/features/changelog/changelog.type';
import { getUserById } from '@/features/users/users.service';
import type { User } from '@/libs/prisma';
import createChangelogMiddleware from './changelog.middleware';

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
    trackedFields: ['roleId', 'entiteId', 'statutId', 'active'],
  });

export default userChangelogMiddleware;
