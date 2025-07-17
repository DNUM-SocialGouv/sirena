import type { TaskContext } from 'node-cron';
import { importRequetes } from '@/features/dematSocial/dematSocial.service';

const cb = async (ctx: TaskContext) => {
  await importRequetes(ctx.triggeredAt);
};

const name = 'importDematSocial';

export default {
  cb,
  name,
};
