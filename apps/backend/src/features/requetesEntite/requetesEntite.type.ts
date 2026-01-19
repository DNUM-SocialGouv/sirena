import type { z } from 'zod';
import type { GetRequetesEntiteQuerySchema } from './requetesEntite.schema.js';

export type GetRequetesEntiteQuery = z.infer<typeof GetRequetesEntiteQuerySchema>;
