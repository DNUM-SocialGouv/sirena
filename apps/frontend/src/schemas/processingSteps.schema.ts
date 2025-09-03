import { z } from 'zod';

export const UpdateProcessingStepNameSchema = z.object({
  stepName: z
    .string()
    .min(1, {
      message: "Le nom de l'étape est obligatoire. Veuillez le renseigner pour mettre à jour l'étape.",
    })
    .max(300, {
      message: `Le nom de l'étape ne peut pas dépasser 300 caractères.`,
    })
    .transform((str) => str.trim().replace(/[<>]/g, '').replace(/\s+/g, ' '))
    .refine((val) => val.length > 0, {
      message: "Le nom de l'étape contient des caractères invalides.",
    }),
});

export type UpdateProcessingStepNameInput = z.infer<typeof UpdateProcessingStepNameSchema>;
