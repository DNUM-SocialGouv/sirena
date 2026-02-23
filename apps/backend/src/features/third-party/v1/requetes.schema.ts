import { z } from 'zod';

const optionalDatetime = z.iso
  .datetime()
  .optional()
  .transform((v) => (v ? new Date(v) : undefined));

const EmailSchema = z
  .string()
  .email('Invalid email format')
  .meta({ description: 'Email address', examples: ['user@example.com'] })
  .optional();

// Adresse Schema
export const AdresseSchema = z
  .object({
    label: z.string().optional(),
    numero: z.string().optional(),
    rue: z.string().optional(),
    codePostal: z.string().optional(),
    ville: z.string().optional(),
  })
  .meta({ title: 'Adresse' });

// Declarant Schema
const DeclarantSchema = z
  .object({
    nom: z.string().min(1, 'Declarant nom is required'),
    prenom: z.string().min(1, 'Declarant prenom is required'),
    civiliteId: z.string().optional(),
    email: EmailSchema,
    ageId: z.string().optional(),
    telephone: z.string().optional(),
    estHandicapee: z.boolean().optional(),
    lienVictimeId: z.string().optional(),
    estVictime: z.boolean().optional(),
    veutGarderAnonymat: z.boolean().optional(),
    adresse: AdresseSchema.optional(),
    commentaire: z.string().optional(),
  })
  .meta({ title: 'Declarant' });

// Victime Schema (maps to participant internally)
const VictimeSchema = z
  .object({
    nom: z.string().min(1, 'Victime nom is required'),
    prenom: z.string().min(1, 'Victime prenom is required'),
    civiliteId: z.string().optional(),
    email: EmailSchema,
    telephone: z.string().optional(),
    ageId: z.string().optional(),
    adresse: AdresseSchema.optional(),
    estHandicapee: z.boolean().optional(),
    commentaire: z.string().optional(),
    veutGarderAnonymat: z.boolean().optional(),
    estVictimeInformee: z.boolean().optional(),
    autrePersonnes: z.string().optional(),
  })
  .meta({ title: 'Victime' });

// Lieu de Survenue Schema
const LieuDeSurvenueSchema = z
  .object({
    codePostal: z.string().optional(),
    commentaire: z.string().optional(),
    adresse: AdresseSchema.optional(),
    lieuTypeId: z.string().optional(),
    lieuPrecision: z.string().optional(),
    transportTypeId: z.string().optional(),
    societeTransport: z.string().optional(),
    finess: z.string().optional(),
    tutelle: z.string().optional(),
    categCode: z.string().optional(),
    categLib: z.string().optional(),
  })
  .meta({ title: 'LieuDeSurvenue' });

// Mis en Cause Schema
const MisEnCauseSchema = z
  .object({
    misEnCauseTypeId: z.string().optional(),
    misEnCauseTypePrecisionId: z.string().optional(),
    rpps: z.string().optional(),
    commentaire: z.string().optional(),
  })
  .meta({ title: 'MisEnCause' });

// Demarches Engagees Schema
const DemarchesEngageesSchema = z
  .object({
    demarches: z.array(z.string()).optional(),
    dateContactEtablissement: optionalDatetime,
    etablissementARepondu: z.boolean().optional(),
    commentaire: z.string().optional(),
    datePlainte: optionalDatetime,
    autoriteTypeId: z.string().optional(),
  })
  .meta({ title: 'DemarchesEngagees' });

// Fait Schema
const FaitSchema = z
  .object({
    motifsDeclaratifs: z.array(z.string()).optional(),
    consequences: z.array(z.string()).optional(),
    maltraitanceTypes: z.array(z.string()).optional(),
    dateDebut: optionalDatetime,
    dateFin: optionalDatetime,
    commentaire: z.string().optional(),
  })
  .meta({ title: 'Fait' });

// Situation Schema
const SituationSchema = z
  .object({
    lieuDeSurvenue: LieuDeSurvenueSchema.optional(),
    misEnCause: MisEnCauseSchema.optional(),
    demarchesEngagees: DemarchesEngageesSchema.optional(),
    faits: z.array(FaitSchema).optional(),
  })
  .meta({ title: 'Situation' });

// Create Requete Request Schema
export const CreateRequeteRequestSchema = z
  .object({
    receptionDate: optionalDatetime,
    declarant: DeclarantSchema,
    victime: VictimeSchema,
    situations: z.array(SituationSchema).min(1, 'At least one situation is required'),
  })
  .meta({ title: 'CreateRequeteRequest' });

// Create Requete Response Schema
export const CreateRequeteResponseSchema = z
  .object({
    requeteId: z.string(),
    receptionDate: z.iso.datetime().nullable(),
    receptionTypeId: z.string().nullable(),
    createdAt: z.iso.datetime(),
  })
  .meta({ title: 'CreateRequeteResponse' });

// Attachment Response Schema
export const AddAttachmentResponseSchema = z
  .object({
    fileId: z.string(),
    fileName: z.string(),
    mimeType: z.string(),
    size: z.number(),
  })
  .meta({ title: 'AddAttachmentResponse' });

// Attachment Params Schema
export const AttachmentParamsSchema = z.object({
  requeteId: z.string().min(1, 'requeteId is required'),
});

export type CreateRequeteRequest = z.infer<typeof CreateRequeteRequestSchema>;
export type CreateRequeteResponse = z.infer<typeof CreateRequeteResponseSchema>;
export type AddAttachmentResponse = z.infer<typeof AddAttachmentResponseSchema>;
