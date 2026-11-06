import { MAX_FILE_SIZE } from '../../config/files.constant.js';
import factoryWithLogs from '../../helpers/factories/appWithLogs.js';
import { apiKeyAuth } from '../../middlewares/apiKey.middleware.js';
import { streamSafeBodyLimit } from '../../middlewares/bodyLimit.middleware.js';
import { rateLimiter } from '../../middlewares/rateLimiter.middleware.js';
import EnumsController from './v1/enums.controller.js';
import RequetesController from './v1/requetes.controller.js';
import { MAX_JSON_BODY_SIZE } from './v1/shared.js';
import TestController from './v1/test.controller.js';

const app = factoryWithLogs
  .createApp()
  .use(rateLimiter())
  .use(streamSafeBodyLimit({ multipartMaxSize: MAX_FILE_SIZE, otherMaxSize: MAX_JSON_BODY_SIZE }))
  .use(apiKeyAuth())
  .route('/v1', TestController)
  .route('/v1/enums', EnumsController)
  .route('/v1/requetes', RequetesController);

export default app;
