// import LoginApp from '@/features/login/login.controller.ts';
// import LogoutApp from '@/features/logout/logout.controller.ts';
import AuthApp from '@/features/auth/auth.controller.ts';
import UsersApp from '@/features/users/users.controller.ts';
import appFactory from '@/helpers/factories/appWithLogs.ts';
import pinoLogger from '@/middlewares/pino.middleware.ts';
import { requestId } from 'hono/request-id';
import { errorHandler } from './helpers/errors.ts';
import { fonctionalLogger } from './helpers/fonctionnalsLogs.ts';

export const app = appFactory
  .createApp()
  .use(pinoLogger())
  .use(requestId())
  .use(fonctionalLogger)
  .route('/users', UsersApp)
  .route('/auth', AuthApp)
  .onError(errorHandler);
