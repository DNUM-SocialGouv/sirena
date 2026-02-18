import factoryWithLogs from '../../../helpers/factories/appWithLogs.js';
import {
  getAgeEnumsRoute,
  getCiviliteEnumsRoute,
  getConsequenceEnumsRoute,
  getLienVictimeEnumsRoute,
  getMaltraitanceTypeEnumsRoute,
  getMisEnCauseTypeEnumsRoute,
  getMotifDeclaratifEnumsRoute,
} from './enums.route.js';
import {
  getAgeEnums,
  getCiviliteEnums,
  getConsequenceEnums,
  getLienVictimeEnums,
  getMaltraitanceTypeEnums,
  getMisEnCauseTypeEnums,
  getMotifDeclaratifEnums,
} from './enums.service.js';

const app = factoryWithLogs
  .createApp()

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
  })

  .get('/motif-declaratif', getMotifDeclaratifEnumsRoute, async (c) => {
    const logger = c.get('logger');
    const motifDeclaratifEnums = await getMotifDeclaratifEnums();
    logger.info({ enumCount: motifDeclaratifEnums.length }, 'MotifDeclaratif enums retrieved successfully');

    return c.json({ data: motifDeclaratifEnums }, 200);
  })

  .get('/consequence', getConsequenceEnumsRoute, async (c) => {
    const logger = c.get('logger');
    const consequenceEnums = await getConsequenceEnums();
    logger.info({ enumCount: consequenceEnums.length }, 'Consequence enums retrieved successfully');

    return c.json({ data: consequenceEnums }, 200);
  })

  .get('/maltraitance-type', getMaltraitanceTypeEnumsRoute, async (c) => {
    const logger = c.get('logger');
    const maltraitanceTypeEnums = await getMaltraitanceTypeEnums();
    logger.info({ enumCount: maltraitanceTypeEnums.length }, 'MaltraitanceType enums retrieved successfully');

    return c.json({ data: maltraitanceTypeEnums }, 200);
  });

export default app;
