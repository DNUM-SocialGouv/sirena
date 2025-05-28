import { SessionSchema } from '@/libs/zod';
import type { z as Z } from 'zod';

export const SessionCreationSchema = SessionSchema.pick({
  userId: true,
  token: true,
  pcIdToken: true,
  expiresAt: true,
});

export type SessionCreationDto = Z.infer<typeof SessionCreationSchema>;
