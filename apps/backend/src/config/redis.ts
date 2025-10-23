import { Redis } from 'ioredis';
import { envVars } from './env';

export const connection = new Redis({
  host: envVars.REDIS_HOST,
  port: envVars.REDIS_PORT,
  ...(envVars.REDIS_USER && { username: envVars.REDIS_USER }),
  ...(envVars.REDIS_PASSWORD && { password: envVars.REDIS_PASSWORD }),
  maxRetriesPerRequest: null,
});
