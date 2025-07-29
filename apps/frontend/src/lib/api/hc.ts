import { type Client, hcWithType } from '@sirena/backend/hc';
import { getTrackingHeaders } from '@/lib/tracking';

export const client = hcWithType('/api', {
  headers: getTrackingHeaders,
});

export type App = Client;
