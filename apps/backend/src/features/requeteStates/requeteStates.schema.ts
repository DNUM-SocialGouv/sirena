import { paginationQueryParamsSchema } from '@sirena/backend-utils/schemas';
import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { Prisma } from '@/libs/prisma';
import { z } from '@/libs/zod';

const columns = [
  Prisma.RequeteStateScalarFieldEnum.stepName,
  Prisma.RequeteStateScalarFieldEnum.createdAt,
  Prisma.RequeteStateScalarFieldEnum.updatedAt,
  Prisma.RequeteStateScalarFieldEnum.statutId,
] as const;

export const GetRequeteStatesQuerySchema = paginationQueryParamsSchema(columns);

export const UpdateRequeteStateStatutSchema = z.object({
  statutId: z.enum([REQUETE_STATUT_TYPES.A_FAIRE, REQUETE_STATUT_TYPES.EN_COURS, REQUETE_STATUT_TYPES.FAIT]),
});

export const addRequeteStatesNoteBodySchema = z.object({
  content: z.string(),
  fileIds: z.array(z.string()).optional(),
});
