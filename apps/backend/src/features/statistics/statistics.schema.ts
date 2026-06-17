import { z } from 'zod';

export const StatisticsDashboardCardLayoutSchema = z.object({
  col: z.number().int(),
  row: z.number().int(),
  sizeX: z.number().int(),
  sizeY: z.number().int(),
});

export const StatisticsDashboardCardSchema = z.object({
  id: z.number().int(),
  dashcardId: z.number().int(),
  name: z.string(),
  display: z.string().nullable(),
  layout: StatisticsDashboardCardLayoutSchema.nullable(),
  data: z.array(z.record(z.string(), z.unknown())),
});

export const StatisticsDashboardPayloadSchema = z.object({
  cards: z.array(StatisticsDashboardCardSchema),
});
