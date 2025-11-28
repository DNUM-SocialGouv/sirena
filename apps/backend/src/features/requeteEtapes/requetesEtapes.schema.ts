import { paginationQueryParamsSchema } from '@sirena/backend-utils/schemas';
import { REQUETE_ETAPE_STATUT_TYPES } from '@sirena/common/constants';
import { Prisma } from '@/libs/prisma';
import { z } from '@/libs/zod';

const columns = [
  Prisma.RequeteEtapeScalarFieldEnum.nom,
  Prisma.RequeteEtapeScalarFieldEnum.createdAt,
  Prisma.RequeteEtapeScalarFieldEnum.updatedAt,
  Prisma.RequeteEtapeScalarFieldEnum.statutId,
] as const;

export const AddProcessingStepBodySchema = z.object({
  nom: z
    .string()
    .min(1, { message: "Le champ 'Nom de l'étape' est obligatoire. Veuillez le renseigner pour ajouter une étape." }),
});

export const GetRequeteEtapesQuerySchema = paginationQueryParamsSchema(columns);

export const UpdateRequeteEtapeStatutSchema = z.object({
  statutId: z.enum([
    REQUETE_ETAPE_STATUT_TYPES.A_FAIRE,
    REQUETE_ETAPE_STATUT_TYPES.EN_COURS,
    REQUETE_ETAPE_STATUT_TYPES.FAIT,
  ]),
});

export const UpdateRequeteEtapeNomSchema = z.object({
  nom: z
    .string()
    .min(1, {
      message: "Le nom de l'étape est obligatoire. Veuillez le renseigner pour mettre à jour l'étape.",
    })
    .max(300, {
      message: `Le nom de l'étape ne peut pas dépasser 300 caractères.`,
    })
    .transform((str) => str.trim().replace(/[<>]/g, '').replace(/\s+/g, ' '))
    .refine((val) => val.length > 0, {
      message: "Le nom de l'étape ne peut pas être vide après nettoyage.",
    }),
});
