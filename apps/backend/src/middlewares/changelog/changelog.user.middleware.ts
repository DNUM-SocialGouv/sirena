import { getUserById } from '@/features/users/users.service';
import type { User } from '@/libs/prisma';
import createChangelogMiddleware from './changelog.middleware';

export const userChangelogMiddleware = createChangelogMiddleware<User>({
  entity: 'User',
  getEntityById: (c) => {
    const id = c.req.param('id');
    return getUserById(id, null, null);
  },
  getEntityId: (c) => c.req.param('id'),
  trackedFields: ['roleId', 'entiteId', 'statutId', 'active'],
});

export default userChangelogMiddleware;
