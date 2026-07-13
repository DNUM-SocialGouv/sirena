import { REQUETE_PRIORITE_TYPES } from '@sirena/common/constants';
import { z } from 'zod';

export const QueryParamsSchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  entiteId: z.string().optional(),
  departementCodes: z.string().optional(),
  domaineIds: z.string().optional(),
  statutIds: z.string().optional(),
  prioriteId: z
    .enum([REQUETE_PRIORITE_TYPES.BASSE, REQUETE_PRIORITE_TYPES.MOYENNE, REQUETE_PRIORITE_TYPES.HAUTE])
    .optional(),
  rootEntiteIds: z.string().optional(),
});

export type QueryParams = z.infer<typeof QueryParamsSchema>;
