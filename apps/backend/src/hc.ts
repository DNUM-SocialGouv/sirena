import { hc } from 'hono/client';
import type { app } from './app.js';

const client = hc<typeof app>('', { init: { credentials: 'include' } });
export type Client = typeof client;

export const hcWithType = (...args: Parameters<typeof hc>): Client => hc<typeof app>(...args);
