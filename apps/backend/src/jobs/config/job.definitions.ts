import { envVars } from '@/config/env';
import { fetchRequetes } from '../tasks/fetchRequetes.task';

export const jobHandlers = [
  {
    name: 'fetch-requetes',
    task: fetchRequetes,
    repeatEveryMs: parseInt(envVars.CRON_DEMAT_SOCIAL, 10) * 1000,
    data: {
      timeoutMs: 1000 * 60 * 5,
    },
  },
] as const;
