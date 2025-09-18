import { z } from '@/libs/zod';

export const addNoteBodySchema = z
  .object({
    texte: z.string().transform((s) => s.trim()),
    requeteEtapeId: z.string().min(1, 'id vide'),
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

export const updateNoteBodySchema = z.object({
  texte: z
    .string()
    .min(1, {
      message: 'Le contenu de la note ne peut pas être vide.',
    })
    .transform((s) => s.trim()),
  fileIds: z.array(z.string().min(1, 'Un fichier est requis')).optional(),
});
