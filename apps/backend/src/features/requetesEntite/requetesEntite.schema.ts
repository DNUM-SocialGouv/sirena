import { paginationQueryParamsSchema } from '@sirena/backend-utils/schemas';
import { DeclarantDataSchema, PersonneConcerneeDataSchema } from '@sirena/common/schemas';
import { Prisma } from '@/libs/prisma';
import { RequeteEntiteSchema, RequeteEtapeSchema, RequeteSchema, z } from '@/libs/zod';

const columns = [Prisma.RequeteEntiteScalarFieldEnum.requeteId, Prisma.RequeteEntiteScalarFieldEnum.entiteId] as const;

export const GetRequetesEntiteQuerySchema = paginationQueryParamsSchema(columns);

export const GetRequeteEntiteSchema = RequeteEntiteSchema.extend({
  requete: RequeteSchema,
  requeteEtape: z.array(RequeteEtapeSchema),
});

export const GetRequetesEntiteResponseSchema = z.array(GetRequeteEntiteSchema);

export const AddProcessingStepBodySchema = z.object({
  nom: z
    .string()
    .min(1, { message: "Le champ 'Nom de l'étape' est obligatoire. Veuillez le renseigner pour ajouter une étape." }),
});

export const addProcessingStepNoteBodySchema = z.object({
  content: z.string().min(1, {
    message: "Le champ 'content' est obligatoire. Veuillez le renseigner pour ajouter une note à l'étape.",
  }),
});

export const CreateRequeteBodySchema = z.object({
  declarant: DeclarantDataSchema.optional(),
  participant: PersonneConcerneeDataSchema.optional(),
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
