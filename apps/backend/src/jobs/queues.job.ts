import { Queue } from 'bullmq';
import { connection } from '@/config/redis';
import type { JobDataMap, JobName, JobResult } from './jobs.type';

export const cronQueue = new Queue<JobDataMap[JobName], JobResult, JobName>('cron-queue', { connection });
