import { HTTPException404NotFound } from '@/helpers/errors.ts';
import type { AppBindingsLogs } from '@/helpers/factories/appWithLogs.ts';
import { OpenAPIHono } from '@hono/zod-openapi';
import { deleteUserRoute, getUserRoute, getUsersRoute, postUserRoute } from './users.route.ts';
import { createUser, deleteUser, getUserById, getUsers } from './users.service.ts';

const app = new OpenAPIHono<AppBindingsLogs>()
  .openapi(getUsersRoute, async (c) => {
    const users = await getUsers();
    return c.json(users, 200);
  })

  .openapi(getUserRoute, async (c) => {
    const { id } = c.req.valid('param');
    const user = await getUserById(id);
    if (!user) {
      throw HTTPException404NotFound();
    }
    return c.json(user, 200);
  })

  .openapi(deleteUserRoute, async (c) => {
    const id = c.req.param('id');
    const user = await getUserById(id);
    if (!user) {
      throw HTTPException404NotFound();
    }
    await deleteUser(id);
    return c.json({ message: 'User deleted' }, 200);
  })

  .openapi(postUserRoute, async (c) => {
    const newUser = c.req.valid('json');
    const user = await createUser(newUser);
    return c.json(user, 201);
  });

export default app;
