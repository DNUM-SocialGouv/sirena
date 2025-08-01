import pino from 'pino';
import { getLogLevelConfig } from '@/helpers/middleware';

export const createDefaultLogger = () => {
  const logConfig = getLogLevelConfig();
  return pino({
    level: logConfig.console,
    serializers: {
      err: pino.stdSerializers.err,
    },
  });
};
