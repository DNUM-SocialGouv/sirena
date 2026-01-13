import { envVars } from '@/config/env';
import { fetchRequetes } from '../tasks/fetchRequetes.task';
import { queueUnprocessedFiles } from '../tasks/queueUnprocessedFiles.task';
import { retryAffectation } from '../tasks/retryAffectation.task';
import { retryImportRequetes } from '../tasks/retryImportRequetes.task';

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
] as const;
