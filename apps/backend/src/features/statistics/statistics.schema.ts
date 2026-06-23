import { z } from 'zod';

export const StatisticsDashboardQuerySchema = z
  .object({
    startDate: z.iso.date().optional(),
    endDate: z.iso.date().optional(),
  })
  .refine((q) => !q.startDate || !q.endDate || q.startDate <= q.endDate, {
    message: 'startDate doit être antérieure ou égale à endDate',
    path: ['startDate'],
  });

export type StatisticsDashboardQuery = z.infer<typeof StatisticsDashboardQuerySchema>;

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
