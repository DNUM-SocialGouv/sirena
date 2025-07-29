import { envVars } from '@/config/env';
import type { JobHandler } from './jobs.type';
import { fetchRequests } from './tasks/fetchRequests';

export const jobHandlers: JobHandler[] = [
  {
    name: 'fetch-requests',
    task: fetchRequests,
    repeatEveryMs: parseInt(envVars.CRON_DEMAT_SOCIAL, 10) * 1000,
  },
];
