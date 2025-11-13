import { paginationQueryParamsSchema } from '@sirena/backend-utils/schemas';
import { DeclarantDataSchema, PersonneConcerneeDataSchema, SituationDataSchema } from '@sirena/common/schemas';
import { Prisma } from '@/libs/prisma';
import { RequeteEntiteSchema, RequeteEtapeSchema, RequeteSchema, z } from '@/libs/zod';

const columns = [Prisma.RequeteEntiteScalarFieldEnum.requeteId, Prisma.RequeteEntiteScalarFieldEnum.entiteId] as const;

export const GetRequetesEntiteQuerySchema = paginationQueryParamsSchema(columns);

export const GetRequeteEntiteSchema = RequeteEntiteSchema.extend({
  requete: RequeteSchema,
  requeteEtape: z.array(RequeteEtapeSchema),
});

export const GetRequetesEntiteResponseSchema = z.array(GetRequeteEntiteSchema);

export const CreateRequeteBodySchema = z.object({
  declarant: DeclarantDataSchema.optional(),
  participant: PersonneConcerneeDataSchema.optional(),
  fileIds: z.array(z.string()).optional(),
});

export const UpdateDeclarantBodySchema = z.object({
  declarant: DeclarantDataSchema,
  controls: z
    .object({
      declarant: z.object({
        updatedAt: z.string().datetime(),
      }),
    })
    .optional(),
});

export const UpdateParticipantBodySchema = z.object({
  participant: PersonneConcerneeDataSchema,
  controls: z
    .object({
      participant: z.object({
        updatedAt: z.string().datetime(),
      }),
    })
    .optional(),
});

export const UpdateRequeteFilesBodySchema = z.object({
  fileIds: z.array(z.string()),
});
export const UpdateSituationBodySchema = z.object({
  situation: SituationDataSchema,
});

export const CloseRequeteBodySchema = z.object({
  reasonId: z.string().min(1, {
    message:
      'Vous devez renseigner la raison de la clôture pour clôturer la requête. Veuillez sélectionner une valeur dans la liste.',
  }),
  precision: z.string().trim().max(5000).optional(),
  fileIds: z.array(z.string()).optional(),
});

export const CloseRequeteResponseSchema = z.object({
  etapeId: z.string(),
  closedAt: z.string().datetime(),
  noteId: z.string().nullable(),
});
