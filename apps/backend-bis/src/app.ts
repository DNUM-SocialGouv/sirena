import UsersApp from '@/features/users/users.controller.ts';
import type { AppBindingsLogs } from '@/helpers/factories/appWithLogs.ts';
import pinoLogger from '@/middlewares/pino.middleware.ts';
import { OpenAPIHono } from '@hono/zod-openapi';
import { errorHandler } from './helpers/errors.ts';

export const app = new OpenAPIHono()
  .use(pinoLogger())
  .route('/', UsersApp)
  .doc31('/doc', {
    openapi: '3.1.0',
    info: {
      version: '1.0.0',
      title: 'Sirena',
    },
  })
  .onError(errorHandler);

const authorsApp = new OpenAPIHono()
  .get('/', (c) => c.json({ result: 'list authors' }))
  .post('/', (c) => c.json({ result: 'create an author' }, 201))
  .get('/:id', (c) => c.json({ result: `get ${c.req.param('id')}` }));
