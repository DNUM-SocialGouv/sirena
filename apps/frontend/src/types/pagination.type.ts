import type { z } from 'zod';
import type { QueryParamsSchema } from '@/schemas/pagination.schema';

export type QueryParams = z.infer<typeof QueryParamsSchema>;
