import { z } from 'zod';
import { MESURE_PROTECTION } from '../constants/mesureProtection.constant.js';
import { ReponseOuiNonSchema } from './reponseOuiNon.schema.js';

export const MesureProtectionSchema = z.enum(MESURE_PROTECTION);

export const PersonneConcerneeDataSchema = z.object({
  civilite: z.string().optional(),
  nom: z.string().optional(),
  prenom: z.string().optional(),
  age: z.string().optional(),
  dateNaissance: z
    .string()
    .optional()
    .nullable()
    .refine(
      (value) => {
        if (value == null || value === '') return true;
        const date = new Date(value);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return date <= today;
      },
      {
        message: 'La date de naissance ne peut pas être dans le futur',
      },
    ),
  adresseDomicile: z.string().optional(),
  codePostal: z.string().optional(),
  ville: z.string().optional(),
  numeroTelephone: z.string().optional(),
  courrierElectronique: z.email().optional().or(z.literal('')),
  estHandicapee: ReponseOuiNonSchema.optional().nullable(),
  consentCommuniquerIdentite: ReponseOuiNonSchema.optional().nullable(),
  estVictimeInformee: ReponseOuiNonSchema.optional().nullable(),
  victimeInformeeCommentaire: z.string().optional(),
  autrePersonnes: z.string().optional(),
  aAutrePersonnes: ReponseOuiNonSchema.optional().nullable(),
  mesureProtection: MesureProtectionSchema.optional().nullable(),
  commentaire: z.string().optional(),
});

export type MesureProtection = z.infer<typeof MesureProtectionSchema>;
export type PersonneConcerneeData = z.infer<typeof PersonneConcerneeDataSchema>;
