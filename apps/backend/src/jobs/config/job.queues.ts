import { Queue } from 'bullmq';
import { connection } from '../../config/redis.js';
import type { JobDataMap, JobName, JobResult } from './job.types.js';

export const cronQueue = new Queue<JobDataMap[JobName], JobResult, JobName>('cron-queue', { connection });
