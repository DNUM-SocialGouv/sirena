import { z } from 'zod';

export const RequeteSchema = z.object({
  id: z.string(),
  commentaire: z.string(),
  receptionDate: z.coerce.date().nullable(),
  dematSocialId: z.number().int().nullable(),
  receptionTypeId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
