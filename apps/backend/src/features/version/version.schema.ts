import { z } from '@/libs/zod';

export const VersionResponseSchema = z.object({
  version: z.string(),
});
