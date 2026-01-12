import type { Job } from 'bullmq';

export type JobDataMap = {
  'fetch-requetes': {
    timeoutMs: number;
  };
  'retry-affectation': {
    batchSize: number;
  };
  'retry-import-requetes': {
    batchSize: number;
  };
  'queue-unprocessed-files': Record<string, never>;
};

export type JobName = keyof JobDataMap;

export type JobResult = Promise<void>;

export type JobHandler<N extends JobName = JobName> = {
  name: N;
  task: (job: Job<JobDataMap[N]>) => JobResult;
  repeatEveryMs: number;
  data: JobDataMap[N];
  runOnStart?: boolean;
};

export type CronContext<J extends Job> = {
  job: J;
  date?: Date;
  startedAt: Date;
  cronId: string;
};
