import { hc } from 'hono/client';
import type { app } from './app.ts';

const client = hc<typeof app>('');
export type Client = typeof client;

export const hcWithType = (...args: Parameters<typeof hc>): Client => hc<typeof app>(...args);
