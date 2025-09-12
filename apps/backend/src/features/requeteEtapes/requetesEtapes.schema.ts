import { paginationQueryParamsSchema } from '@sirena/backend-utils/schemas';
import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { Prisma } from '@/libs/prisma';
import { z } from '@/libs/zod';

const columns = [
  Prisma.RequeteEtapeScalarFieldEnum.nom,
  Prisma.RequeteEtapeScalarFieldEnum.createdAt,
  Prisma.RequeteEtapeScalarFieldEnum.updatedAt,
  Prisma.RequeteEtapeScalarFieldEnum.statutId,
] as const;

export const GetRequeteEtapesQuerySchema = paginationQueryParamsSchema(columns);

export const UpdateRequeteEtapeStatutSchema = z.object({
  statutId: z.enum([REQUETE_STATUT_TYPES.A_FAIRE, REQUETE_STATUT_TYPES.EN_COURS, REQUETE_STATUT_TYPES.FAIT]),
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

export const addRequeteEtapeNoteBodySchema = z
  .object({
    texte: z.string().transform((s) => s.trim()),
    fileIds: z.array(z.string().min(1, 'id vide')).optional(),
  })
  .superRefine((val, ctx) => {
    const hasContent = val.texte.length > 0;
    const hasFiles = (val.fileIds?.length ?? 0) > 0;

    if (!hasContent && !hasFiles) {
      const message = 'Renseigne du texte OU au moins 1 fichier.';
      ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ['texte'] });
      ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ['fileIds'] });
    }
  });

export const updateRequeteEtapeNoteBodySchema = z.object({
  texte: z
    .string()
    .min(1, {
      message: 'Le contenu de la note ne peut pas être vide.',
    })
    .transform((s) => s.trim()),
  fileIds: z.array(z.string().min(1, 'Un fichier est requis')).optional(),
});
