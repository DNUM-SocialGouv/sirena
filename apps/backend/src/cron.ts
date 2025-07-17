import dematSocialCron from '@/crons/dematSocial.cron';
import { createCron } from '@/helpers/cron';

const startCrons = () => {
  createCron('', dematSocialCron.name, dematSocialCron.cb).start();
};

const endCrons = () => {
  createCron('', dematSocialCron.name, dematSocialCron.cb).stop();
};

const shutdown = async () => {
  endCrons();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startCrons();
