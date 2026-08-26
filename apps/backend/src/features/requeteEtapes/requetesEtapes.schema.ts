import { paginationQueryParamsSchema } from '@sirena/backend-utils/schemas';
import {
  ACKNOWLEDGMENT_SEND_MODES,
  RAPPEL_DATE_REQUIRED_MESSAGE,
  REQUETE_ETAPE_RAPPEL_TYPES,
  REQUETE_ETAPE_STATUT_TYPES,
  REQUETE_ETAPE_TYPES,
} from '@sirena/common/constants';
import { z } from 'zod';
import { Prisma } from '../../libs/prisma.js';

export const RequeteEtapeSchema = z.object({
  id: z.uuid(),
  nom: z.string(),
  type: z.enum([
    REQUETE_ETAPE_TYPES.CREATION,
    REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT,
    REQUETE_ETAPE_TYPES.REOPEN,
    REQUETE_ETAPE_TYPES.MANUAL,
    REQUETE_ETAPE_TYPES.ASSIGNMENT,
  ]),
  estPartagee: z.boolean(),
  acknowledgmentSendMode: z.enum(ACKNOWLEDGMENT_SEND_MODES).nullable(),
  acknowledgmentSendOperationId: z.uuid().nullable(),
  statutId: z.string().nullable(),
  dateRealisation: z.coerce.date().nullable(),
  rappelType: z
    .enum([
      REQUETE_ETAPE_RAPPEL_TYPES.JOURS_7,
      REQUETE_ETAPE_RAPPEL_TYPES.JOURS_15,
      REQUETE_ETAPE_RAPPEL_TYPES.JOURS_30,
      REQUETE_ETAPE_RAPPEL_TYPES.PERSONNALISE,
    ])
    .nullable(),
  rappelDate: z.coerce.date().nullable(),
  requeteId: z.string(),
  entiteId: z.string(),
  assignedEntiteId: z.string().nullable(),
  clotureReasonIds: z.array(z.string()).optional(),
  clotureEffectiveDate: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Safe projection of an uploaded file for the read endpoint: never exposes `metadata`
// (which carries the file encryption keys) nor internal storage paths (`safeFilePath`).
const EtapeUploadedFileBaseSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  size: z.number(),
  status: z.string(),
  scanStatus: z.string(),
  sanitizeStatus: z.string(),
});

const EtapeUploadedFileSchema = EtapeUploadedFileBaseSchema.extend({
  canDelete: z.boolean(),
  createdAt: z.coerce.date(),
  uploadedBy: z.object({ prenom: z.string(), nom: z.string() }).nullable(),
});

const RequeteEtapeNoteSchema = z.object({
  id: z.string(),
  texte: z.string(),
  createdAt: z.coerce.date(),
  author: z.object({ prenom: z.string(), nom: z.string() }).nullable(),
});

const AttributedEntiteAdministrativeSchema = z.object({
  id: z.string(),
  nomComplet: z.string(),
  entiteTypeId: z.string(),
});

// Response schema for the list endpoint, which enriches each step with editability,
// timeline presentation metadata, notes and files (see getRequeteEtapes).
const RequeteEtapeWithDetailsBaseSchema = RequeteEtapeSchema.extend({
  entiteAdministrative: AttributedEntiteAdministrativeSchema,
  assignedEntite: AttributedEntiteAdministrativeSchema.nullable(),
  editable: z.boolean(),
  canOnlyEditNotes: z.boolean(),
  uploadedFiles: z.array(EtapeUploadedFileSchema),
  notes: z.array(RequeteEtapeNoteSchema),
});

export const RequeteEtapeWithDetailsSchema = z.discriminatedUnion('timelineItemType', [
  RequeteEtapeWithDetailsBaseSchema.extend({
    timelineItemType: z.literal('ENTITY_STEP'),
    attributedEntiteAdministrative: AttributedEntiteAdministrativeSchema,
  }),
  RequeteEtapeWithDetailsBaseSchema.extend({
    timelineItemType: z.literal('NEUTRAL_EVENT'),
    attributedEntiteAdministrative: z.null(),
  }),
]);

const columns = [
  Prisma.RequeteEtapeScalarFieldEnum.nom,
  Prisma.RequeteEtapeScalarFieldEnum.createdAt,
  Prisma.RequeteEtapeScalarFieldEnum.updatedAt,
  Prisma.RequeteEtapeScalarFieldEnum.statutId,
] as const;

const etapeNomSchema = z
  .string()
  .min(1, { message: "Le champ 'Nom de l'étape' est obligatoire. Veuillez le renseigner pour ajouter une étape." })
  .max(300, { message: `Le nom de l'étape ne peut pas dépasser 300 caractères.` })
  .transform((str) => str.trim().replace(/[<>]/g, '').replace(/\s+/g, ' '))
  .refine((val) => val.length > 0, { message: "Le nom de l'étape ne peut pas être vide." });

const etapeStatutEnum = z.enum([REQUETE_ETAPE_STATUT_TYPES.A_FAIRE, REQUETE_ETAPE_STATUT_TYPES.FAIT]);

const noteTexteSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(1, { message: 'Le texte de la note est obligatoire.' })
      .max(10_000, { message: 'Maximum 10 000 caractères.' }),
  );

const fileIdsSchema = z.array(z.string().min(1, 'id vide')).refine((ids) => new Set(ids).size === ids.length, {
  message: 'Les fichiers ne doivent pas être dupliqués.',
});

// DateRealisation is mandatory when statut is « Fait ».
const requireDateWhenFait = (data: { statutId?: string | null; dateRealisation?: Date }) =>
  data.statutId !== REQUETE_ETAPE_STATUT_TYPES.FAIT || data.dateRealisation != null;

const etapeRappelTypeSchema = z.enum([
  REQUETE_ETAPE_RAPPEL_TYPES.JOURS_7,
  REQUETE_ETAPE_RAPPEL_TYPES.JOURS_15,
  REQUETE_ETAPE_RAPPEL_TYPES.JOURS_30,
  REQUETE_ETAPE_RAPPEL_TYPES.PERSONNALISE,
]);

const etapeRappelDateSchema = z.iso.date();

const requireRappelDateWhenPersonnalise = (data: { rappelType?: string | null; rappelDate?: string }) =>
  data.rappelType !== REQUETE_ETAPE_RAPPEL_TYPES.PERSONNALISE || data.rappelDate != null;

export const AddProcessingStepBodySchema = z
  .object({
    nom: etapeNomSchema,
    statutId: etapeStatutEnum.nullable().optional(),
    dateRealisation: z.coerce.date().optional(),
    rappelType: etapeRappelTypeSchema.nullable().optional(),
    rappelDate: etapeRappelDateSchema.optional(),
    notes: z
      .array(z.object({ texte: noteTexteSchema }))
      .optional()
      .default([]),
    fileIds: fileIdsSchema.optional().default([]),
    estPartagee: z.boolean().optional(),
  })
  .refine(requireDateWhenFait, { path: ['dateRealisation'], message: 'La date de réalisation est obligatoire.' })
  .refine(requireRappelDateWhenPersonnalise, { path: ['rappelDate'], message: RAPPEL_DATE_REQUIRED_MESSAGE });

export const UpdateProcessingStepBodySchema = z
  .object({
    nom: etapeNomSchema,
    statutId: etapeStatutEnum.nullable().optional(),
    dateRealisation: z.coerce.date().optional(),
    rappelType: etapeRappelTypeSchema.nullable().optional(),
    rappelDate: etapeRappelDateSchema.optional(),

    notes: z.array(z.object({ id: z.string().optional(), texte: noteTexteSchema })).default([]),
    fileIds: fileIdsSchema.default([]),
    estPartagee: z.boolean().optional(),
  })
  .refine(requireDateWhenFait, { path: ['dateRealisation'], message: 'La date de réalisation est obligatoire.' })
  .refine(requireRappelDateWhenPersonnalise, { path: ['rappelDate'], message: RAPPEL_DATE_REQUIRED_MESSAGE });

export const AddClotureFilesSchema = z.object({
  fileIds: fileIdsSchema.min(1, { message: 'Vous devez sélectionner au moins un fichier.' }),
});

export const GetRequeteEtapesQuerySchema = paginationQueryParamsSchema(columns);

export const SendAcknowledgmentBodySchema = z.object({
  comment: z
    .string()
    .max(30000)
    .transform((str) => str.trim().replace(/[<>]/g, ''))
    .optional(),
});
