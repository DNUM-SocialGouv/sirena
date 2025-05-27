import { type Client, hcWithType } from '@sirena/backend/hc';

export const client = hcWithType('/api');
export type App = Client;
