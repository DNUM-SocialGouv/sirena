import { z } from 'zod';

export const SituationDataSchema = z.object({
  lieuDeSurvenue: z
    .object({
      lieuType: z.string().optional(),
      lieuPrecision: z.string().optional(),
      adresse: z.string().optional(),
      numero: z.string().optional(),
      rue: z.string().optional(),
      codePostal: z.string().optional(),
      ville: z.string().optional(),
      transportType: z.string().optional(),
      societeTransport: z.string().optional(),
      finess: z.string().optional(),
      commentaire: z.string().optional(),
    })
    .optional(),

  misEnCause: z
    .object({
      misEnCauseType: z.string().optional(),
      misEnCausePrecision: z.string().optional(),
      professionType: z.string().optional(),
      professionDomicileType: z.string().optional(),
      rpps: z.string().optional(),
      commentaire: z.string().optional(),
    })
    .optional(),

  fait: z
    .object({
      maltraitanceTypes: z.array(z.string()).optional(),
      sousMotifs: z.array(z.string()).optional(),
      commentaire: z.string().optional(),
      dateDebut: z.string().optional(),
      dateFin: z.string().optional(),
      autresPrecisions: z.string().optional(),
      consequences: z.array(z.string()).optional(),
      fileIds: z.array(z.string()).optional(),
    })
    .optional(),

  demarchesEngagees: z
    .object({
      demarches: z.array(z.string()).optional(),
      dateContactEtablissement: z.string().optional(),
      dateContactResponsables: z.string().optional(),
      etablissementARepondu: z.boolean().optional(),
      reponseRecueResponsables: z.boolean().optional(),
      organisme: z.string().optional(),
      precisionsOrganisme: z.string().optional(),
      autoriteType: z.string().optional(),
      datePlainte: z.string().optional(),
      dateDepotPlainte: z.string().optional(),
      lieuDepotPlainte: z.string().optional(),
      commentaire: z.string().optional(),
      fileIds: z.array(z.string()).optional(),
    })
    .optional(),
});

export type SituationData = z.infer<typeof SituationDataSchema>;
