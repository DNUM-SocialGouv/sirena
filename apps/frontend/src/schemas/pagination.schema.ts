import { PAGINATION_MAX_LIMIT, REQUETE_PRIORITE_TYPES } from '@sirena/common/constants';
import { z } from 'zod';

// Bounds aligned with the backend pagination, so URL parameters cannot produce a 400.
export const QueryParamsSchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(PAGINATION_MAX_LIMIT).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  entiteId: z.string().optional(),
  departementCodes: z.string().optional(),
  domaineIds: z.string().optional(),
  statutIds: z.string().optional(),
  prioriteId: z
    .enum([REQUETE_PRIORITE_TYPES.BASSE, REQUETE_PRIORITE_TYPES.MOYENNE, REQUETE_PRIORITE_TYPES.HAUTE])
    .optional(),
  over90Days: z.boolean().optional(),
  rappel: z.boolean().optional(),
  rootEntiteIds: z.string().optional(),
});

export type QueryParams = z.infer<typeof QueryParamsSchema>;
