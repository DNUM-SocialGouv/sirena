import { paginationQueryParamsSchema } from '@sirena/backend-utils/schemas';
import { RECEPTION_TYPE, REQUETE_PRIORITE_TYPES } from '@sirena/common/constants';
import { DeclarantDataSchema, PersonneConcerneeDataSchema, SituationDataSchema } from '@sirena/common/schemas';
import { Prisma } from '@/libs/prisma';
import { EntiteSchema, RequeteEntiteSchema, RequeteEtapeSchema, RequeteSchema, z } from '@/libs/zod';

const columns = [
  Prisma.RequeteEntiteScalarFieldEnum.requeteId,
  Prisma.RequeteEntiteScalarFieldEnum.entiteId,
  Prisma.RequeteEntiteScalarFieldEnum.statutId,
  Prisma.RequeteEntiteScalarFieldEnum.prioriteId,
  'requete.id',
  'requete.createdAt',
  'requete.participant.identite.nom',
  'priorite.sortOrder',
] as const;

export const GetRequetesEntiteQuerySchema = paginationQueryParamsSchema(columns);

export const GetRequeteEntiteResponseSchema = RequeteSchema.extend({
  entite: EntiteSchema,
});

const OtherEntiteAffectedSchema = z
  .object({
    statutId: z.string(),
  })
  .merge(
    EntiteSchema.pick({
      id: true,
      label: true,
      nomComplet: true,
      entiteTypeId: true,
    }),
  );

const DirectionSchema = EntiteSchema.pick({
  entiteMereId: true,
  id: true,
  nomComplet: true,
  label: true,
});

export const GetOtherEntitesAffectedResponseSchema = z.object({
  otherEntites: z.array(OtherEntiteAffectedSchema),
  directions: z.array(DirectionSchema),
});

const receptionDate = z.preprocess((val) => (val === '' ? null : val), z.string().date().nullable().optional());
const receptionTypeId = z.preprocess(
  (val) => (val === '' ? null : val),
  z
    .enum(Object.keys(RECEPTION_TYPE) as [string, ...string[]])
    .nullable()
    .optional(),
);
const requeteControl = z.object({
  updatedAt: z.string().datetime(),
});

export const GetRequeteEntiteSchema = RequeteEntiteSchema.extend({
  requete: RequeteSchema,
  requeteEtape: z.array(RequeteEtapeSchema),
});

export const GetRequetesEntiteResponseSchema = z.array(GetRequeteEntiteSchema);

export const CreateRequeteBodySchema = z.object({
  declarant: DeclarantDataSchema.optional(),
  participant: PersonneConcerneeDataSchema.optional(),
  receptionDate,
  receptionTypeId,
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
export const UpdateTypeAndDateRequeteBodySchema = z.object({
  receptionDate,
  receptionTypeId,
  controls: requeteControl.optional(),
});

export const UpdatePrioriteBodySchema = z.object({
  prioriteId: z
    .enum([REQUETE_PRIORITE_TYPES.BASSE, REQUETE_PRIORITE_TYPES.MOYENNE, REQUETE_PRIORITE_TYPES.HAUTE])
    .nullable(),
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
