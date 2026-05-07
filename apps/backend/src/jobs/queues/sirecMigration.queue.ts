import { Queue } from 'bullmq';
import { envVars } from '../../config/env.js';
import { connection } from '../../config/redis.js';

export interface SirecMigrationJobData {
  sirecId: number;
}

export const sirecMigrationQueue = new Queue<SirecMigrationJobData>(envVars.REDIS_MIGRATION_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 7 * 86400, count: 5000 },
  },
});
