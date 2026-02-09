import factoryWithLogs from '../../../helpers/factories/appWithLogs.js';
import { apiKeyAuth } from '../../../middlewares/apiKey.middleware.js';
import { getAgeEnumsRoute, getCiviliteEnumsRoute } from './enums.route.js';
import { getAgeEnums, getCiviliteEnums } from './enums.service.js';

const app = factoryWithLogs
  .createApp()
  .use('/*', apiKeyAuth())

  .get('/age', getAgeEnumsRoute, async (c) => {
    const logger = c.get('logger');
    const ageEnums = await getAgeEnums();
    logger.info({ enumCount: ageEnums.length }, 'Age enums retrieved successfully');

    return c.json({ data: ageEnums }, 200);
  })

  .get('/civilite', getCiviliteEnumsRoute, async (c) => {
    const logger = c.get('logger');
    const civiliteEnums = await getCiviliteEnums();
    logger.info({ enumCount: civiliteEnums.length }, 'Civilite enums retrieved successfully');

    return c.json({ data: civiliteEnums }, 200);
  });

export default app;
