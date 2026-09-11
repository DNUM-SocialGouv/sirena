import { envVars } from '../../config/env.js';
import { fetchRequetes } from '../tasks/fetchRequetes.task.js';
import { fileIntegrityCheck } from '../tasks/fileIntegrityCheck.task.js';
import { purgeAccessLogs } from '../tasks/purgeAccessLogs.task.js';
import { queueUnprocessedFiles } from '../tasks/queueUnprocessedFiles.task.js';
import { retryAffectation } from '../tasks/retryAffectation.task.js';
import { retryImportRequetes } from '../tasks/retryImportRequetes.task.js';
import { syncGeoReferentiel } from '../tasks/syncGeoReferentiel.task.js';

const SYNC_GEO_REFERENTIEL_INTERVAL_MS = parseInt(envVars.CRON_SYNC_GEO_REFERENTIEL, 10) * 1000;

/**
 * Le job tourne aussi au démarrage, et sa garde de fraîcheur est dérivée de l'intervalle
 * configuré : une exécution est acceptée dès que 80 % de celui-ci s'est écoulé. Un
 * redéploiement ne rejoue donc pas une synchronisation récente, mais abaisser
 * CRON_SYNC_GEO_REFERENTIEL accélère réellement la suivante au lieu de l'annuler.
 */
const SYNC_GEO_REFERENTIEL_MIN_INTERVAL_MS = Math.round(SYNC_GEO_REFERENTIEL_INTERVAL_MS * 0.8);

export const jobHandlers = [
  {
    name: 'fetch-requetes',
    task: fetchRequetes,
    repeatEveryMs: parseInt(envVars.CRON_DEMAT_SOCIAL, 10) * 1000,
    data: {
      timeoutMs: 1000 * 60 * 5,
    },
    runOnStart: false,
  },
  {
    name: 'retry-affectation',
    task: retryAffectation,
    repeatEveryMs: parseInt(envVars.CRON_RETRY_AFFECTATION, 10) * 1000,
    data: {
      batchSize: 5,
    },
    runOnStart: false,
  },
  {
    name: 'retry-import-requetes',
    task: retryImportRequetes,
    repeatEveryMs: parseInt(envVars.CRON_RETRY_IMPORT_REQUETES, 10) * 1000,
    data: {
      batchSize: 10,
    },
    runOnStart: false,
  },
  {
    name: 'queue-unprocessed-files',
    task: queueUnprocessedFiles,
    repeatEveryMs: parseInt(envVars.CRON_QUEUE_UNPROCESSED_FILES, 10) * 1000,
    data: {},
    runOnStart: true,
  },
  {
    name: 'file-integrity-check',
    task: fileIntegrityCheck,
    repeatEveryMs: parseInt(envVars.CRON_FILE_INTEGRITY_CHECK, 10) * 1000,
    data: {
      timeoutMs: 1000 * 60 * 10,
    },
    runOnStart: false,
  },
  {
    name: 'purge-access-logs',
    task: purgeAccessLogs,
    repeatEveryMs: parseInt(envVars.CRON_PURGE_ACCESS_LOGS, 10) * 1000,
    data: {
      retentionDays: envVars.ACCESS_LOG_RETENTION_DAYS,
    },
    runOnStart: true,
  },
  {
    name: 'sync-geo-referentiel',
    task: syncGeoReferentiel,
    repeatEveryMs: SYNC_GEO_REFERENTIEL_INTERVAL_MS,
    data: {
      timeoutMs: 1000 * 60 * 10,
      minIntervalMs: SYNC_GEO_REFERENTIEL_MIN_INTERVAL_MS,
    },
    // L'intervalle dépasse la durée de vie usuelle d'un déploiement : sans exécution au
    // démarrage, la synchronisation risquerait de ne jamais se déclencher. La garde de
    // fraîcheur de la tâche évite de la rejouer à chaque redémarrage.
    runOnStart: true,
  },
] as const;
