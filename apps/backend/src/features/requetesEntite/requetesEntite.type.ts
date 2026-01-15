import type { z } from 'zod';
import type { GetRequetesEntiteQuerySchema } from './requetesEntite.schema';

export type GetRequetesEntiteQuery = z.infer<typeof GetRequetesEntiteQuerySchema>;
