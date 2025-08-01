import { csrf } from 'hono/csrf';
import '@/libs/instrument';
import AuthController from '@/features/auth/auth.controller';
import DematSocialMapperController from '@/features/dematSocialMapping/dematSocialMapping.controller';
import EntitesController from '@/features/entites/entites.controller';
import HealthController from '@/features/health/health.controller';
import ProfileController from '@/features/profile/profile.controller';
import RequetesEntiteController from '@/features/requetesEntite/requetesEntite.controller';
import RolesController from '@/features/roles/roles.controller';
import UsersController from '@/features/users/users.controller';
import VersionController from '@/features/version/version.controller';
import appFactory from '@/helpers/factories/appWithLogs';
import { enhancedPinoMiddleware } from '@/middlewares/pino.middleware';
import { sentryMiddleware } from '@/middlewares/sentry.middleware';
import { envVars } from './config/env';
import { errorHandler } from './helpers/errors';

export const app = appFactory
  .createApp()
  .use(sentryMiddleware())
  .use(enhancedPinoMiddleware())
  .use(
    csrf({
      origin: [envVars.FRONTEND_URI],
    }),
  )
  .route('/auth', AuthController)
  .route('/roles', RolesController)
  .route('/users', UsersController)
  .route('/entites', EntitesController)
  .route('/demat-social-mapping', DematSocialMapperController)
  .route('/requetes-entite', RequetesEntiteController)
  .route('/profile', ProfileController)
  .route('/health', HealthController)
  .route('/version', VersionController)
  .get('/sentry', () => {
    throw new Error('Sentry test error');
  })
  .onError(errorHandler);
