import { z } from 'zod';

export const SessionSchema = z.object({
  id: z.string().cuid(),
  userId: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  pcIdToken: z.string(),
  createdAt: z.coerce.date(),
});

export const SessionCreationSchema = SessionSchema.pick({
  userId: true,
  token: true,
  pcIdToken: true,
  expiresAt: true,
});

export type SessionCreationDto = z.infer<typeof SessionCreationSchema>;
