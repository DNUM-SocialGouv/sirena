import { AsyncLocalStorage } from 'node:async_hooks';
import type { createDefaultLogger } from '@/helpers/pino';

export const abortControllerStorage = new AsyncLocalStorage<AbortController>();

export const loggerStorage = new AsyncLocalStorage<ReturnType<typeof createDefaultLogger>>();
