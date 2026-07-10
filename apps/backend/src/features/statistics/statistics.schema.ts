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

export const MetabaseColumnSchema = z.object({
  name: z.string(),
  display_name: z.string(),
  base_type: z.string(),
  semantic_type: z.string().nullable(),
  source: z.string().nullable(),
});

export const MetabaseCardDataSchema = z.object({
  cols: z.array(MetabaseColumnSchema),
  rows: z.array(z.array(z.unknown())),
});

export const StatisticsDashboardCardSchema = z.object({
  id: z.number().int(),
  dashcardId: z.number().int(),
  name: z.string(),
  display: z.string().nullable(),
  layout: StatisticsDashboardCardLayoutSchema.nullable(),
  data: MetabaseCardDataSchema,
});

export const StatisticsDashboardPayloadSchema = z.object({
  cards: z.array(StatisticsDashboardCardSchema),
});
