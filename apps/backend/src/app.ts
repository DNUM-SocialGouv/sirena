import { csrf } from 'hono/csrf';
import '@/libs/instrument';
import { sentry } from '@hono/sentry';
import AuthController from '@/features/auth/auth.controller';
import DematSocialMapperController from '@/features/dematSocialMapping/dematSocialMapping.controller';
import EntitesController from '@/features/entites/entites.controller';
import HealthController from '@/features/health/health.controller';
import ProfileController from '@/features/profile/profile.controller';
import RequeteStatesController from '@/features/requeteStates/requeteStates.controller';
import RequetesEntiteController from '@/features/requetesEntite/requetesEntite.controller';
import RolesController from '@/features/roles/roles.controller';
import UploadedFilesController from '@/features/uploadedFiles/uploadedFiles.controller';
import UsersController from '@/features/users/users.controller';
import VersionController from '@/features/version/version.controller';
import appFactory from '@/helpers/factories/appWithLogs';
import { enhancedPinoMiddleware } from '@/middlewares/pino.middleware';
import { envVars } from './config/env';
import { errorHandler } from './helpers/errors';

const baseApp = appFactory.createApp();
const appWithSentry = envVars.SENTRY_ENABLED
  ? baseApp.use(
      sentry({
        dsn: envVars.SENTRY_DSN_BACKEND,
        environment: envVars.SENTRY_ENVIRONMENT,
      }),
    )
  : baseApp;

export const app = appWithSentry
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
  .route('/uploaded-files', UploadedFilesController)
  .route('/demat-social-mapping', DematSocialMapperController)
  .route('/requetes-entite', RequetesEntiteController)
  .route('/requete-states', RequeteStatesController)
  .route('/profile', ProfileController)
  .route('/health', HealthController)
  .route('/version', VersionController)
  .get('/sentry', (c) => {
    const sentry = c.get('sentry');
    throw new Error(`Sentry test error - Sentry ${sentry ? 'enabled' : 'disabled'}`);
  })
  .onError(errorHandler);
