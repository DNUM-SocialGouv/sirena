import type { z } from '@/libs/zod';
import type { GetRequetesEntiteQuerySchema } from './requetesEntite.schema';

export type GetRequetesEntiteQuery = z.infer<typeof GetRequetesEntiteQuerySchema>;
