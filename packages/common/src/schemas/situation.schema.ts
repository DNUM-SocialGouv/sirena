import { z } from 'zod';

export const SituationDataSchema = z.object({
  lieuDeSurvenue: z
    .object({
      lieuType: z.string().optional(),
      lieuPrecision: z.string().optional(),
      adresse: z.string().optional(),
      codePostal: z.string().optional(),
      societeTransport: z.string().optional(),
      finess: z.string().optional(),
    })
    .optional(),

  misEnCause: z
    .object({
      misEnCauseType: z.string().optional(),
      misEnCausePrecision: z.string().optional(),
      rpps: z.string().optional(),
      commentaire: z.string().optional(),
    })
    .optional(),

  fait: z
    .object({
      motifs: z.array(z.string()).optional(),
      commentaire: z.string().optional(),
      dateDebut: z.string().optional(),
      dateFin: z.string().optional(),
      autresPrecisions: z.string().optional(),
      consequences: z.array(z.string()).optional(),
      fileIds: z.array(z.string()).optional(),
      files: z
        .array(
          z.object({
            id: z.string(),
            fileName: z.string(),
            size: z.number(),
          }),
        )
        .optional(),
    })
    .optional(),

  demarchesEngagees: z
    .object({
      demarches: z.array(z.string()).optional(),
      dateContactResponsables: z.string().optional(),
      reponseRecueResponsables: z.boolean().optional(),
      precisionsOrganisme: z.string().optional(),
      dateDepotPlainte: z.string().optional(),
      lieuDepotPlainte: z.string().optional(),
    })
    .optional(),
});

export type SituationData = z.infer<typeof SituationDataSchema>;
