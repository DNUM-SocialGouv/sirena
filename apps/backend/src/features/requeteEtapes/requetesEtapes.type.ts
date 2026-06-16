import type { z } from 'zod';
import type {
  GetRequeteEtapesQuerySchema,
  UpdateRequeteEtapeDateRealisationSchema,
  UpdateRequeteEtapeNomSchema,
  UpdateRequeteEtapeStatutSchema,
} from './requetesEtapes.schema.js';

export type RequeteEtapeCreationDto = {
  nom: string;
};
export type GetRequeteEtapesQuery = z.infer<typeof GetRequeteEtapesQuerySchema>;
export type UpdateRequeteEtapeStatutDto = z.infer<typeof UpdateRequeteEtapeStatutSchema>;

export type UpdateRequeteEtapeNomDto = z.infer<typeof UpdateRequeteEtapeNomSchema>;

export type UpdateRequeteEtapeDateRealisationDto = z.infer<typeof UpdateRequeteEtapeDateRealisationSchema>;
