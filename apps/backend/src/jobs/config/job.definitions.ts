import { envVars } from '@/config/env';
import { fetchRequetes } from '../tasks/fetchRequetes.task';
import { retryAffectation } from '../tasks/retryAffectation.task';

export const jobHandlers = [
  {
    name: 'fetch-requetes',
    task: fetchRequetes,
    repeatEveryMs: parseInt(envVars.CRON_DEMAT_SOCIAL, 10) * 1000,
    data: {
      timeoutMs: 1000 * 60 * 5,
    },
  },
  {
    name: 'retry-affectation',
    task: retryAffectation,
    repeatEveryMs: parseInt(envVars.CRON_RETRY_AFFECTATION, 10) * 1000,
    data: {
      batchSize: 5,
    },
  },
] as const;
