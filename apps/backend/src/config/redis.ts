import { Redis } from 'ioredis';
import { envVars } from './env';

export const connection = new Redis({
  host: envVars.REDIS_HOST,
  port: envVars.REDIS_PORT,
  password: envVars.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});
