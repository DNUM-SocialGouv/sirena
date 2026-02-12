import factoryWithLogs from '../../../helpers/factories/appWithLogs.js';
import { apiKeyAuth } from '../../../middlewares/apiKey.middleware.js';
import {
  getAgeEnumsRoute,
  getCiviliteEnumsRoute,
  getLienVictimeEnumsRoute,
  getMisEnCauseTypeEnumsRoute,
} from './enums.route.js';
import { getAgeEnums, getCiviliteEnums, getLienVictimeEnums, getMisEnCauseTypeEnums } from './enums.service.js';

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
  })

  .get('/lien-victime', getLienVictimeEnumsRoute, async (c) => {
    const logger = c.get('logger');
    const lienVictimeEnums = await getLienVictimeEnums();
    logger.info({ enumCount: lienVictimeEnums.length }, 'Lien victime enums retrieved successfully');

    return c.json({ data: lienVictimeEnums }, 200);
  })
  .get('/mis-en-cause-type', getMisEnCauseTypeEnumsRoute, async (c) => {
    const logger = c.get('logger');
    const misEnCauseTypeEnums = await getMisEnCauseTypeEnums();
    logger.info({ enumCount: misEnCauseTypeEnums.length }, 'MisEnCauseType enums retrieved successfully');

    return c.json({ data: misEnCauseTypeEnums }, 200);
  });

export default app;
