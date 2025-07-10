import type { z } from '@/libs/zod';
import type { PatchUserSchema } from './dematSocialMapping.schema';

export type PatchDematSocialMappingDto = z.infer<typeof PatchUserSchema>;
