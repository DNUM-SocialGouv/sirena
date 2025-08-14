import type { z } from '@/libs/zod';
import type { GetRequeteStatesQuerySchema } from './requeteStates.schema';

export type RequeteStateCreationDto = {
  stepName: string;
};
export type GetRequeteStatesQuery = z.infer<typeof GetRequeteStatesQuerySchema>;

export type CreateRequeteStateNoteDto = {
  content: string;
  userId: string;
  requeteEntiteStateId: string;
};
