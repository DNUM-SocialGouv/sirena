import { Queue } from 'bullmq';
import { connection } from '@/config/redis';
import type { JobDataMap, JobName, JobResult } from './job.types';

export const cronQueue = new Queue<JobDataMap[JobName], JobResult, JobName>('cron-queue', { connection });
