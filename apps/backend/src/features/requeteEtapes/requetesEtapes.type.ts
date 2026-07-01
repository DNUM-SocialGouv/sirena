import type { z } from 'zod';
import type {
  AddProcessingStepBodySchema,
  GetRequeteEtapesQuerySchema,
  UpdateProcessingStepBodySchema,
} from './requetesEtapes.schema.js';

export type RequeteEtapeCreationDto = {
  nom: string;
};
export type AddProcessingStepDto = z.infer<typeof AddProcessingStepBodySchema>;
export type UpdateProcessingStepDto = z.infer<typeof UpdateProcessingStepBodySchema>;
export type GetRequeteEtapesQuery = z.infer<typeof GetRequeteEtapesQuerySchema>;
