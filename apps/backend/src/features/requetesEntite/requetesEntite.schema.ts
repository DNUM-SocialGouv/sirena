import { paginationQueryParamsSchema } from '@sirena/backend-utils/schemas';
import { RECEPTION_TYPE, REQUETE_PRIORITE_TYPES, REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { DeclarantDataSchema, PersonneConcerneeDataSchema, SituationDataSchema } from '@sirena/common/schemas';
import { z } from 'zod';
import { Prisma } from '../../libs/prisma.js';
import { EntiteSchema } from '../entites/entites.schema.js';
import { RequeteEtapeSchema } from '../requeteEtapes/requetesEtapes.schema.js';
import { RequeteSchema } from '../requetes/requetes.schema.js';

const RequeteEntiteSchema = z.object({
  requeteId: z.string(),
  statutId: z.string(),
  prioriteId: z.string().nullable(),
  entiteId: z.string(),
});

export const SituationEntiteSchema = z.object({
  situationId: z.string(),
  entiteId: z.string(),
});

export const SituationSchema = z.object({
  id: z.uuid(),
  lieuDeSurvenueId: z.string(),
  misEnCauseId: z.string(),
  demarchesEngageesId: z.string(),
  requeteId: z.string().nullable(),
});

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

export const GetRequetesEntiteQuerySchema = paginationQueryParamsSchema(columns).extend({
  entiteId: z.string().optional(),
});

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

const SubAdministrativeEntitesSchema = EntiteSchema.pick({
  entiteMereId: true,
  id: true,
  nomComplet: true,
  label: true,
}).merge(
  z.object({
    chain: z.array(
      z.object({
        entiteMereId: z.string().nullable(),
        id: z.string(),
        label: z.string(),
        nomComplet: z.string(),
      }),
    ),
  }),
);

export const GetOtherEntitesAffectedResponseSchema = z.object({
  otherEntites: z.array(OtherEntiteAffectedSchema),
  subAdministrativeEntites: z.array(SubAdministrativeEntitesSchema),
});

const receptionDate = z.iso.date().nullable().optional();
const receptionTypeId = z
  .enum([
    RECEPTION_TYPE.EMAIL,
    RECEPTION_TYPE.COURRIER,
    RECEPTION_TYPE.AUTRE,
    RECEPTION_TYPE.PLATEFORME,
    RECEPTION_TYPE.TELEPHONE,
  ])
  .nullable()
  .optional();
const requeteControl = z.object({
  updatedAt: z.iso.datetime(),
});

const SituationEntiteWithEntiteSchema = SituationEntiteSchema.extend({
  entite: EntiteSchema,
});

const SituationWithEntitesSchema = SituationSchema.extend({
  situationEntites: z.array(SituationEntiteWithEntiteSchema),
}).passthrough();

const RequeteWithSituationsSchema = RequeteSchema.extend({
  situations: z.array(SituationWithEntitesSchema),
}).passthrough();

export const GetRequeteEntiteSchema = RequeteEntiteSchema.extend({
  requete: RequeteWithSituationsSchema,
  requeteEtape: z.array(RequeteEtapeSchema),
});

export const GetRequetesEntiteResponseSchema = z.array(GetRequeteEntiteSchema);

const provenanceIdOptional = z.string().nullable().optional();
const provenancePrecisionOptional = z.string().trim().max(2000).nullable().optional();

export const CreateRequeteBodySchema = z.object({
  declarant: DeclarantDataSchema.optional(),
  participant: PersonneConcerneeDataSchema.optional(),
  receptionDate,
  receptionTypeId,
  provenanceId: provenanceIdOptional,
  provenancePrecision: provenancePrecisionOptional,
  fileIds: z.array(z.string()).optional(),
});

export const UpdateDeclarantBodySchema = z.object({
  declarant: DeclarantDataSchema,
  controls: z
    .object({
      declarant: z.object({
        updatedAt: z.iso.datetime(),
      }),
    })
    .optional(),
});

export const UpdateParticipantBodySchema = z.object({
  participant: PersonneConcerneeDataSchema,
  controls: z
    .object({
      participant: z.object({
        updatedAt: z.iso.datetime(),
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
  provenanceId: provenanceIdOptional,
  provenancePrecision: provenancePrecisionOptional,
  controls: requeteControl.optional(),
});

export const UpdatePrioriteBodySchema = z.object({
  prioriteId: z
    .enum([REQUETE_PRIORITE_TYPES.BASSE, REQUETE_PRIORITE_TYPES.MOYENNE, REQUETE_PRIORITE_TYPES.HAUTE])
    .nullable(),
});

export const UpdateStatutBodySchema = z.object({
  statutId: z.enum([REQUETE_STATUT_TYPES.NOUVEAU, REQUETE_STATUT_TYPES.TRAITEE]),
});

export const CloseRequeteBodySchema = z.object({
  reasonIds: z.array(z.string().min(1)).min(1, {
    message:
      'Vous devez renseigner au moins une raison de clôture pour clôturer la requête. Veuillez sélectionner une valeur dans la liste.',
  }),
  precision: z.string().trim().max(5000).optional(),
  fileIds: z.array(z.string()).optional(),
});

export const CloseRequeteResponseSchema = z.object({
  etapeId: z.string(),
  closedAt: z.iso.datetime(),
  noteId: z.string().nullable(),
});
