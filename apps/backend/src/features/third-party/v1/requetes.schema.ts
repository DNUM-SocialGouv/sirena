import {
  AGE,
  CIVILITE,
  DS_LIEU_TYPE,
  DS_PROFESSION_DOMICILE_TYPE,
  DS_PROFESSION_TYPE,
  LIEN_VICTIME,
  TRANSPORT_TYPE,
} from '@sirena/common/constants';
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
    label: z.string(),
    numero: z.string(),
    rue: z.string(),
    codePostal: z.string(),
    ville: z.string(),
  })
  .meta({ title: 'Adresse' });

// Declarant Schema
export const DeclarantSchema = z
  .object({
    nom: z.string().optional(),
    prenom: z.string().optional(),
    civiliteId: z.enum([CIVILITE.M, CIVILITE.MME, CIVILITE.MX, CIVILITE.NSP]).optional(),
    email: EmailSchema,
    ageId: z.enum([AGE['-18'], AGE['18-29'], AGE['30-59'], AGE['60-79'], AGE['>= 80']]).optional(),
    telephone: z.string(),
    lienVictimeId: z
      .enum([LIEN_VICTIME.MEMBRE_FAMILLE, LIEN_VICTIME.PROCHE, LIEN_VICTIME.PROFESSIONNEL, LIEN_VICTIME.AUTRE])
      .optional(),
    estVictime: z.boolean(),
    veutGarderAnonymat: z.boolean(),
    adresse: AdresseSchema.optional(),
    commentaire: z.string().optional(),
  })
  .meta({ title: 'Declarant' });

// Victime Schema (maps to participant internally)
export const VictimeSchema = z
  .object({
    nom: z.string().optional(),
    prenom: z.string().optional(),
    civiliteId: z.enum([CIVILITE.M, CIVILITE.MME, CIVILITE.MX, CIVILITE.NSP]).optional(),
    email: EmailSchema,
    telephone: z.string().optional(),
    ageId: z.enum([AGE['-18'], AGE['18-29'], AGE['30-59'], AGE['60-79'], AGE['>= 80']]).optional(),
    adresse: AdresseSchema.optional(),
    estHandicapee: z.boolean(),
    commentaire: z.string().optional(),
    veutGarderAnonymat: z.boolean().optional(),
    estVictimeInformee: z.boolean().optional(),
    autrePersonnes: z.string().optional(),
  })
  .meta({ title: 'Victime' });

// Lieu de Survenue Schema
const LieuDeSurvenueSchema = z
  .object({
    codePostal: z.string().min(5, 'codePostal must be at least 5 characters'),
    commentaire: z.string().optional(),
    adresse: AdresseSchema.optional(),
    lieuTypeId: z.enum([
      DS_LIEU_TYPE.AUTRES_ETABLISSEMENTS,
      DS_LIEU_TYPE.CABINET,
      DS_LIEU_TYPE.DOMICILE,
      DS_LIEU_TYPE.ETABLISSEMENT_HANDICAP,
      DS_LIEU_TYPE.ETABLISSEMENT_PERSONNES_AGEES,
      DS_LIEU_TYPE.ETABLISSEMENT_SANTE,
      DS_LIEU_TYPE.ETABLISSEMENT_SOCIAL,
      DS_LIEU_TYPE.TRAJET,
    ]),
    transportTypeId: z
      .enum([
        TRANSPORT_TYPE.POMPIER,
        TRANSPORT_TYPE.ASSU,
        TRANSPORT_TYPE.VSAV,
        TRANSPORT_TYPE.AMBULANCE,
        TRANSPORT_TYPE.VSL,
        TRANSPORT_TYPE.TAXI,
        TRANSPORT_TYPE.AUTRE,
      ])
      .optional(),
    societeTransport: z.string().optional(),
    finess: z.string().optional(),
    categCode: z.string().optional(),
  })
  .meta({ title: 'LieuDeSurvenue' });

// Mis en Cause Schema
const MisEnCauseSchema = z
  .object({
    misEnCauseTypeId: z.string(),
    misEnCauseTypePrecisionId: z.string().optional(),
    rpps: z.string().optional(),
    professionTypeId: z
      .enum([
        DS_PROFESSION_TYPE.PROFESSIONNEL_SANTE,
        DS_PROFESSION_TYPE.PROFESSIONNEL_SOCIAL,
        DS_PROFESSION_TYPE.NPJM,
        DS_PROFESSION_TYPE.AUTRE,
      ])
      .optional(),
    professionDomicileTypeId: z
      .enum([
        DS_PROFESSION_DOMICILE_TYPE.PROFESSIONNEL_SANTE,
        DS_PROFESSION_DOMICILE_TYPE.AUTRE_PROFESSIONNEL,
        DS_PROFESSION_DOMICILE_TYPE.SERVICE_EDUCATION,
        DS_PROFESSION_DOMICILE_TYPE.NPJM,
        DS_PROFESSION_DOMICILE_TYPE.AUTRE,
      ])
      .optional(),
    commentaire: z.string().optional(),
  })
  .meta({ title: 'MisEnCause' });

// Demarches Engagees Schema
const DemarchesEngageesSchema = z
  .object({
    demarches: z.array(z.string()).optional(),
    dateContactEtablissement: optionalDatetime,
    etablissementARepondu: z.boolean().optional(),
    organisme: z.string().optional(),
    commentaire: z.string().optional(),
    datePlainte: optionalDatetime,
    autoriteTypeId: z.string().optional(),
  })
  .meta({ title: 'DemarchesEngagees' });

// Fait Schema
const FaitSchema = z
  .object({
    motifsDeclaratifs: z.array(z.string()).min(1, 'At least one motif declaratif is required'),
    consequences: z.array(z.string()).optional(),
    maltraitanceTypes: z.array(z.string()).min(1, 'At least one maltraitance type is required'),
    dateDebut: optionalDatetime,
    dateFin: optionalDatetime,
    commentaire: z.string().optional(),
  })
  .meta({ title: 'Fait' });

// Situation Schema
export const SituationSchema = z
  .object({
    lieuDeSurvenue: LieuDeSurvenueSchema,
    misEnCause: MisEnCauseSchema,
    demarchesEngagees: DemarchesEngageesSchema.optional(),
    faits: z.array(FaitSchema).min(1, 'At least one fait is required'),
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
