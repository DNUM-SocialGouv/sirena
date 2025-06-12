import { z } from '@/libs/zod';

export const ReturnOpenDataSoftSchema = z.object({
  total_count: z.number(),
  results: z.array(
    z.object({
      tutelle: z.string(),
      finess: z.string(),
    }),
  ),
});
