import { z } from 'zod';

export const DeclarantDataSchema = z.object({
  civilite: z.string().optional(),
  nom: z.string().optional(),
  prenom: z.string().optional(),
  lienAvecPersonneConcernee: z.string().optional(),
  lienAvecPersonneConcerneePrecision: z.string().optional(),
  adresseDomicile: z.string().optional(),
  codePostal: z.string().optional(),
  ville: z.string().optional(),
  numeroTelephone: z.string().optional(),
  courrierElectronique: z.string().email().optional().or(z.literal('')),
  estPersonneConcernee: z.boolean().optional(),
  neSouhaitePasCommuniquerIdentite: z.boolean().optional(),
  autresPrecisions: z.string().optional(),
});

export type DeclarantData = z.infer<typeof DeclarantDataSchema>;
