import type { z } from 'zod';
import type {
  GetRequeteEtapesQuerySchema,
  UpdateRequeteEtapeNomSchema,
  UpdateRequeteEtapeStatutSchema,
} from './requetesEtapes.schema.js';

export type RequeteEtapeCreationDto = {
  nom: string;
};
export type GetRequeteEtapesQuery = z.infer<typeof GetRequeteEtapesQuerySchema>;
export type UpdateRequeteEtapeStatutDto = z.infer<typeof UpdateRequeteEtapeStatutSchema>;

export type UpdateRequeteEtapeNomDto = z.infer<typeof UpdateRequeteEtapeNomSchema>;
