import AuthApp from '@/features/auth/auth.controller.ts';
import UsersApp from '@/features/users/users.controller.ts';
import appFactory from '@/helpers/factories/appWithLogs.ts';
import pinoLogger from '@/middlewares/pino.middleware.ts';
import { csrf } from 'hono/csrf';
import { envVars } from './config/env.ts';
import { errorHandler } from './helpers/errors.ts';

export const app = appFactory
  .createApp()
  .use(pinoLogger())
  .use(
    csrf({
      origin: [envVars.FRONTEND_URI],
    }),
  )
  .route('/auth', AuthApp)
  .route('/users', UsersApp)
  .onError(errorHandler);
