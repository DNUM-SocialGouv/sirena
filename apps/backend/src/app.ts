import LoginApp from '@/features/login/login.controller.ts';
import UsersApp from '@/features/users/users.controller.ts';
import appFactory from '@/helpers/factories/appWithLogs.ts';
import pinoLogger from '@/middlewares/pino.middleware.ts';
import { errorHandler } from './helpers/errors.ts';

export const app = appFactory
  .createApp()
  .use(pinoLogger())
  .route('/users', UsersApp)
  .route('/login', LoginApp)
  .get('/dd', (c) => {
    return c.text('Hello world!');
  })
  .onError(errorHandler);
