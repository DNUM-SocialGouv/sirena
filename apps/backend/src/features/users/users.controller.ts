import { HTTPException404NotFound } from '@/helpers/errors.ts';
import factoryWithLogs from '@/helpers/factories/appWithLogs.ts';
import { validator as zValidator } from 'hono-openapi/zod';
import { deleteUserRoute, getUserRoute, getUsersRoute, postUserRoute } from './users.route.ts';
import { PostUserRequestSchema } from './users.schema.ts';
import { createUser, deleteUser, getUserById, getUsers } from './users.service.ts';

const app = factoryWithLogs
  .createApp()

  .get('/', getUsersRoute, async (c) => {
    const users = await getUsers();
    return c.json({ users }, 200);
  })

  .get('/:id', getUserRoute, async (c) => {
    const id = c.req.param('id');
    const user = await getUserById(id);
    if (!user) {
      throw HTTPException404NotFound();
    }
    return c.json({ user }, 200);
  })

  .delete('/:id', deleteUserRoute, async (c) => {
    const id = c.req.param('id');
    const user = await getUserById(id);
    if (!user) {
      throw HTTPException404NotFound();
    }
    await deleteUser(id);
    return c.json({ id, deleted: true }, 200);
  })

  .post('/', postUserRoute, zValidator('json', PostUserRequestSchema), async (c) => {
    const newUser = c.req.valid('json');
    const user = await createUser(newUser);
    return c.json({ user }, 201);
  });

export default app;
