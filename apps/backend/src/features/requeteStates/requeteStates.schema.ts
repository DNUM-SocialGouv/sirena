import { paginationQueryParamsSchema } from '@sirena/backend-utils/schemas';
import { Prisma } from '@/libs/prisma';

const columns = [
  Prisma.RequeteStateScalarFieldEnum.stepName,
  Prisma.RequeteStateScalarFieldEnum.createdAt,
  Prisma.RequeteStateScalarFieldEnum.updatedAt,
  Prisma.RequeteStateScalarFieldEnum.statutId,
] as const;

export const GetRequeteStatesQuerySchema = paginationQueryParamsSchema(columns);
