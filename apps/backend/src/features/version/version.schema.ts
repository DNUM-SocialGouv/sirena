import { z } from 'zod';

export const VersionResponseSchema = z.object({
  version: z.string(),
});
