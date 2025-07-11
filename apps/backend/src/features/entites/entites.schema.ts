import { paginationQueryParamsSchema } from '@sirena/backend-utils/schemas';
import { Prisma } from '@/libs/prisma';
import { EntiteSchema, z } from '@/libs/zod';

const columns = [
  Prisma.EntiteScalarFieldEnum.nomComplet,
  Prisma.EntiteScalarFieldEnum.label,
  Prisma.EntiteScalarFieldEnum.email,
] as const;

export const GetEntitiesQuerySchema = paginationQueryParamsSchema(columns);

export const GetEntitiesResponseSchema = z.array(EntiteSchema);

export const GetEntitiesChainResponseSchema = z.array(
  EntiteSchema.pick({
    nomComplet: true,
    id: true,
  }).extend({
    disabled: z.boolean(),
  }),
);
