import { paginationQueryParamsSchema } from '@sirena/backend-utils/schemas';
import { Prisma } from '@/libs/prisma';
import { RequeteEntiteSchema, RequeteSchema, RequeteStateSchema, z } from '@/libs/zod';

const columns = [
  Prisma.RequeteEntiteScalarFieldEnum.number,
  Prisma.RequeteEntiteScalarFieldEnum.createdAt,
  Prisma.RequeteEntiteScalarFieldEnum.updatedAt,
] as const;

export const GetRequetesEntiteQuerySchema = paginationQueryParamsSchema(columns);

export const GetRequeteEntiteSchema = RequeteEntiteSchema.extend({
  requete: RequeteSchema,
  requetesEntiteStates: z.array(RequeteStateSchema),
});

export const GetRequetesEntiteResponseSchema = z.array(GetRequeteEntiteSchema);
