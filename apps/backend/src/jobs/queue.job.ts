import { Queue } from 'bullmq';
import { connection } from '@/config/redis';

export const cronQueue = new Queue('cron', {
  connection,
});
