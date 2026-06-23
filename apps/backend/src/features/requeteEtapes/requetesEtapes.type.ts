import type { z } from 'zod';
import type {
  AddProcessingStepBodySchema,
  GetRequeteEtapesQuerySchema,
  UpdateProcessingStepBodySchema,
  UpdateRequeteEtapeDateRealisationSchema,
  UpdateRequeteEtapeNomSchema,
  UpdateRequeteEtapeStatutSchema,
} from './requetesEtapes.schema.js';

export type RequeteEtapeCreationDto = {
  nom: string;
};
export type AddProcessingStepDto = z.infer<typeof AddProcessingStepBodySchema>;
export type UpdateProcessingStepDto = z.infer<typeof UpdateProcessingStepBodySchema>;
export type GetRequeteEtapesQuery = z.infer<typeof GetRequeteEtapesQuerySchema>;
export type UpdateRequeteEtapeStatutDto = z.infer<typeof UpdateRequeteEtapeStatutSchema>;

export type UpdateRequeteEtapeNomDto = z.infer<typeof UpdateRequeteEtapeNomSchema>;

export type UpdateRequeteEtapeDateRealisationDto = z.infer<typeof UpdateRequeteEtapeDateRealisationSchema>;
