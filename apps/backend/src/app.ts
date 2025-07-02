import { csrf } from 'hono/csrf';
import AuthApp from '@/features/auth/auth.controller';
import EntitesApp from '@/features/entites/entites.controller';
import ProfileApp from '@/features/profile/profile.controller';
import RolesApp from '@/features/roles/roles.controller';
import UsersApp from '@/features/users/users.controller';
import appFactory from '@/helpers/factories/appWithLogs';
import pinoLogger from '@/middlewares/pino.middleware';
import { envVars } from './config/env';
import { errorHandler } from './helpers/errors';

export const app = appFactory
  .createApp()
  .use(pinoLogger())
  .use(
    csrf({
      origin: [envVars.FRONTEND_URI],
    }),
  )
  .route('/auth', AuthApp)
  .route('/roles', RolesApp)
  .route('/users', UsersApp)
  .route('/entites', EntitesApp)
  .route('/profile', ProfileApp)
  .onError(errorHandler);
