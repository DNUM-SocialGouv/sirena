import { paginationQueryParamsSchema } from '@sirena/backend-utils/schemas';
import { z } from 'zod';
import { Prisma } from '@/libs/prisma';

export const EntiteSchema = z.object({
  id: z.string().uuid(),
  nomComplet: z.string(),
  label: z.string(),
  email: z.string(),
  emailDomain: z.string(),
  organizationalUnit: z.string(),
  entiteTypeId: z.string(),
  entiteMereId: z.string().nullable(),
  departementCode: z.string().nullable(),
  ctcdCode: z.string().nullable(),
  regionCode: z.string().nullable(),
  regLib: z.string().nullable(),
  dptLib: z.string().nullable(),
});

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
