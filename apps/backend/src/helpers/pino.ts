import pino from 'pino';
import type { EnrichedRequestContext, EnrichedUserContext } from '@/helpers/middleware';
import { createPinoContextData, getLogLevelConfig } from '@/helpers/middleware';

export const createDefaultLogger = () => {
  const logConfig = getLogLevelConfig();
  return pino({
    level: logConfig.console,
    serializers: {
      err: pino.stdSerializers.err,
    },
  });
};

export const createContextualLogger = (
  baseLogger: pino.Logger,
  requestContext: EnrichedRequestContext,
  userContext: EnrichedUserContext | null,
) => {
  const contextData = createPinoContextData(requestContext, userContext);
  return baseLogger.child(contextData);
};
