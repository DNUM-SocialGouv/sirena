import type { z } from 'zod';
import type { CreateFeatureFlagSchema, PatchFeatureFlagSchema } from './featureFlags.schema.js';

export type CreateFeatureFlagDto = z.infer<typeof CreateFeatureFlagSchema>;
export type PatchFeatureFlagDto = z.infer<typeof PatchFeatureFlagSchema>;
