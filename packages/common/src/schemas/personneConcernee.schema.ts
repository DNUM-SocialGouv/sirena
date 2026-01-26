import { z } from 'zod';

export const PersonneConcerneeDataSchema = z.object({
  civilite: z.string().optional(),
  nom: z.string().optional(),
  prenom: z.string().optional(),
  age: z.string().optional(),
  dateNaissance: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (!value) return true;
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
  estHandicapee: z.boolean().optional(),
  consentCommuniquerIdentite: z.boolean().optional(),
  estVictimeInformee: z.boolean().optional(),
  autrePersonnes: z.string().optional(),
  aAutrePersonnes: z.boolean().optional(),
  commentaire: z.string().optional(),
});

export type PersonneConcerneeData = z.infer<typeof PersonneConcerneeDataSchema>;
