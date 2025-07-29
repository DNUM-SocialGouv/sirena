import { AsyncLocalStorage } from 'node:async_hooks';

export const abortControllerStorage = new AsyncLocalStorage<AbortController>();
