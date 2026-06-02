import { z } from 'zod';

export const StatisticsCardParamsSchema = z.object({
  cardId: z.coerce
    .number({ error: 'cardId doit être un entier' })
    .int('cardId doit être un entier')
    .positive('cardId doit être positif'),
});

export const StatisticsCardDataSchema = z.array(z.record(z.string(), z.unknown()));

export const StatisticsDashboardCardSchema = z.object({
  id: z.number().int(),
  dashcardId: z.number().int(),
  name: z.string(),
  data: z.array(z.record(z.string(), z.unknown())),
});

export const StatisticsDashboardPayloadSchema = z.object({
  cards: z.array(StatisticsDashboardCardSchema),
});
