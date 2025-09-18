import type { z } from '@/libs/zod';
import type {
  GetRequeteEtapesQuerySchema,
  UpdateRequeteEtapeNomSchema,
  UpdateRequeteEtapeStatutSchema,
} from './requetesEtapes.schema';

export type RequeteEtapeCreationDto = {
  nom: string;
};
export type GetRequeteEtapesQuery = z.infer<typeof GetRequeteEtapesQuerySchema>;
export type UpdateRequeteEtapeStatutDto = z.infer<typeof UpdateRequeteEtapeStatutSchema>;

export type UpdateRequeteEtapeNomDto = z.infer<typeof UpdateRequeteEtapeNomSchema>;
