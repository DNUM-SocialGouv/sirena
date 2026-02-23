import factoryWithLogs from '../../helpers/factories/appWithLogs.js';
import { apiKeyAuth } from '../../middlewares/apiKey.middleware.js';
import { rateLimiter } from '../../middlewares/rateLimiter.middleware.js';
import EnumsController from './v1/enums.controller.js';
import RequetesController from './v1/requetes.controller.js';
import TestController from './v1/test.controller.js';

const app = factoryWithLogs
  .createApp()
  .use(rateLimiter())
  .use(apiKeyAuth())
  .route('/v1', TestController)
  .route('/v1/enums', EnumsController)
  .route('/v1/requetes', RequetesController);

export default app;
