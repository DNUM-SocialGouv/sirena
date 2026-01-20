import { Queue } from 'bullmq';
import { connection } from '../config/redis.js';

export const cronQueue = new Queue('cron', {
  connection,
});
