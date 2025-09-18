import type { z } from '@/libs/zod';
import type {
  GetRequeteEtapesQuerySchema,
  UpdateRequeteEtapeNomSchema,
  UpdateRequeteEtapeStatutSchema,
  updateRequeteEtapeNoteBodySchema,
} from './requetesEtapes.schema';

export type RequeteEtapeCreationDto = {
  nom: string;
};
export type GetRequeteEtapesQuery = z.infer<typeof GetRequeteEtapesQuerySchema>;
export type UpdateRequeteEtapeStatutDto = z.infer<typeof UpdateRequeteEtapeStatutSchema>;

export type UpdateRequeteEtapeNomDto = z.infer<typeof UpdateRequeteEtapeNomSchema>;

export type CreateRequeteEtapeNoteDto = {
  texte: string;
  userId: string;
  requeteEtapeId: string;
  fileIds: string[];
};

export type UpdateRequeteEtapeNoteDto = z.infer<typeof updateRequeteEtapeNoteBodySchema>;
