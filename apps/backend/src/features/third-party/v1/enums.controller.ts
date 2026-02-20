import factoryWithLogs from '../../../helpers/factories/appWithLogs.js';
import {
  getAgeEnumsRoute,
  getAutoriteTypeEnumsRoute,
  getCiviliteEnumsRoute,
  getConsequenceEnumsRoute,
  getDemarcheEnumsRoute,
  getLienVictimeEnumsRoute,
  getLieuTypeEnumsRoute,
  getMaltraitanceTypeEnumsRoute,
  getMisEnCauseTypeEnumsRoute,
  getMotifDeclaratifEnumsRoute,
} from './enums.route.js';
import {
  getAgeEnums,
  getAutoriteTypeEnums,
  getCiviliteEnums,
  getConsequenceEnums,
  getDemarcheEnums,
  getLienVictimeEnums,
  getLieuTypeEnums,
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

    return c.json(ageEnums, 200);
  })

  .get('/civilite', getCiviliteEnumsRoute, async (c) => {
    const logger = c.get('logger');
    const civiliteEnums = await getCiviliteEnums();
    logger.info({ enumCount: civiliteEnums.length }, 'Civilite enums retrieved successfully');

    return c.json(civiliteEnums, 200);
  })

  .get('/lien-victime', getLienVictimeEnumsRoute, async (c) => {
    const logger = c.get('logger');
    const lienVictimeEnums = await getLienVictimeEnums();
    logger.info({ enumCount: lienVictimeEnums.length }, 'Lien victime enums retrieved successfully');

    return c.json(lienVictimeEnums, 200);
  })
  .get('/mis-en-cause-type', getMisEnCauseTypeEnumsRoute, async (c) => {
    const logger = c.get('logger');
    const misEnCauseTypeEnums = await getMisEnCauseTypeEnums();
    logger.info({ enumCount: misEnCauseTypeEnums.length }, 'MisEnCauseType enums retrieved successfully');

    return c.json(misEnCauseTypeEnums, 200);
  })

  .get('/motif-declaratif', getMotifDeclaratifEnumsRoute, async (c) => {
    const logger = c.get('logger');
    const motifDeclaratifEnums = await getMotifDeclaratifEnums();
    logger.info({ enumCount: motifDeclaratifEnums.length }, 'MotifDeclaratif enums retrieved successfully');

    return c.json(motifDeclaratifEnums, 200);
  })

  .get('/consequence', getConsequenceEnumsRoute, async (c) => {
    const logger = c.get('logger');
    const consequenceEnums = await getConsequenceEnums();
    logger.info({ enumCount: consequenceEnums.length }, 'Consequence enums retrieved successfully');

    return c.json(consequenceEnums, 200);
  })

  .get('/autorite-type', getAutoriteTypeEnumsRoute, async (c) => {
    const logger = c.get('logger');
    const autoriteTypeEnums = await getAutoriteTypeEnums();
    logger.info({ enumCount: autoriteTypeEnums.length }, 'AutoriteType enums retrieved successfully');

    return c.json(autoriteTypeEnums, 200);
  })

  .get('/demarche', getDemarcheEnumsRoute, async (c) => {
    const logger = c.get('logger');
    const demarcheEnums = await getDemarcheEnums();
    logger.info({ enumCount: demarcheEnums.length }, 'Demarche enums retrieved successfully');

    return c.json(demarcheEnums, 200);
  })

  .get('/lieu-type', getLieuTypeEnumsRoute, async (c) => {
    const logger = c.get('logger');
    const lieuTypeEnums = await getLieuTypeEnums();
    logger.info({ enumCount: lieuTypeEnums.length }, 'LieuType enums retrieved successfully');

    return c.json(lieuTypeEnums, 200);
  })

  .get('/maltraitance-type', getMaltraitanceTypeEnumsRoute, async (c) => {
    const logger = c.get('logger');
    const maltraitanceTypeEnums = await getMaltraitanceTypeEnums();
    logger.info({ enumCount: maltraitanceTypeEnums.length }, 'MaltraitanceType enums retrieved successfully');

    return c.json(maltraitanceTypeEnums, 200);
  });

export default app;
