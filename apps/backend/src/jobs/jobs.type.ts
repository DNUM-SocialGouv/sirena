import type { Job } from 'bullmq';

export type JobDataMap = {
  'fetch-requests': {
    timeoutMs: number;
  };
};

export type JobName = keyof JobDataMap;

export type JobResult = Promise<void>;

export type JobHandler<N extends JobName = JobName> = {
  name: N;
  task: (job: Job<JobDataMap[N]>) => JobResult;
  repeatEveryMs: number;
};

export type CronContext<J extends Job> = {
  job: J;
  date?: Date;
  startedAt: Date;
  cronId: string;
};
