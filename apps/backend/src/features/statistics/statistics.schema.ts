import { z } from 'zod';

export const StatisticsDashboardCardSchema = z.object({
  id: z.number().int(),
  dashcardId: z.number().int(),
  name: z.string(),
  display: z.string().nullable(),
  data: z.array(z.record(z.string(), z.unknown())),
});

export const StatisticsDashboardPayloadSchema = z.object({
  cards: z.array(StatisticsDashboardCardSchema),
});
