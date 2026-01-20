import { csrf } from 'hono/csrf';
import './libs/instrument.js';
import { envVars } from './config/env.js';
import AuthController from './features/auth/auth.controller.js';
import EntitesController from './features/entites/entites.controller.js';
import EsanteController from './features/esante/esante.controller.js';
import HealthController from './features/health/health.controller.js';
import NotesController from './features/notes/notes.controller.js';
import ProfileController from './features/profile/profile.controller.js';
import RequeteEtapesController from './features/requeteEtapes/requetesEtapes.controller.js';
import RequetesEntiteController from './features/requetesEntite/requetesEntite.controller.js';
import RolesController from './features/roles/roles.controller.js';
import SSEController from './features/sse/sse.controller.js';
import UploadedFilesController from './features/uploadedFiles/uploadedFiles.controller.js';
import UsersController from './features/users/users.controller.js';
import VersionController from './features/version/version.controller.js';
import { errorHandler } from './helpers/errors.js';
import appFactory from './helpers/factories/appWithLogs.js';
import { enhancedPinoMiddleware } from './middlewares/pino.middleware.js';
import { sentryContextMiddleware } from './middlewares/sentry.middleware.js';

const baseApp = appFactory.createApp();

export const app = baseApp
  .use(enhancedPinoMiddleware())
  .use(sentryContextMiddleware())
  .use(
    csrf({
      origin: [envVars.FRONTEND_URI],
    }),
  )
  .route('/auth', AuthController)
  .route('/roles', RolesController)
  .route('/users', UsersController)
  .route('/entites', EntitesController)
  .route('/esante', EsanteController)
  .route('/uploaded-files', UploadedFilesController)
  .route('/requetes-entite', RequetesEntiteController)
  .route('/requete-etapes', RequeteEtapesController)
  .route('/notes', NotesController)
  .route('/profile', ProfileController)
  .route('/sse', SSEController)
  .route('/health', HealthController)
  .route('/version', VersionController)
  .get('/sentry', () => {
    throw new Error(`Sentry test error - Sentry ${envVars.SENTRY_ENABLED ? 'enabled' : 'disabled'}`);
  })
  .onError(errorHandler);
