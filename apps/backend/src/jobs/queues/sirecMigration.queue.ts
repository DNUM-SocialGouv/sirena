import { Queue } from 'bullmq';
import { connection } from '../../config/redis.js';

export const SIREC_MIGRATION_QUEUE_NAME = 'sirec-ids-to-migrate';

export interface SirecMigrationJobData {
  sirecId: number;
}

export const sirecMigrationQueue = new Queue<SirecMigrationJobData>(SIREC_MIGRATION_QUEUE_NAME, {
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

export async function addSirecIdsToQueue(sirecIds: number[]): Promise<number> {
  if (sirecIds.length === 0) return 0;
  const jobs = sirecIds.map((sirecId) => ({ name: 'migrate', data: { sirecId } }));
  await sirecMigrationQueue.addBulk(jobs);
  return jobs.length;
}
