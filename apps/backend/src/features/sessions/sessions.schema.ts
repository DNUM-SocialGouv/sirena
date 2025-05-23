import zod from '@sirena/database/zod';
import type { z as Z } from 'zod';

export const SessionSchema = zod.SessionSchema;

export const SessionCreationSchema = SessionSchema.pick({
  userId: true,
  token: true,
  pcIdToken: true,
  expiresAt: true,
});

export type SessionCreationDto = Z.infer<typeof SessionCreationSchema>;
