import { openApiProtectedRoute, openApiResponse, openApiResponses } from '@sirena/backend-utils/helpers';
import { RequeteStateNoteSchema, RequeteStateSchema } from '@/libs/zod';
import { GetRequetesEntiteResponseSchema } from './requetesEntite.schema';

export const getRequetesEntiteRoute = openApiProtectedRoute({
  description: 'Get requetes entites',
  responses: {
    ...openApiResponses(GetRequetesEntiteResponseSchema),
  },
});

export const addProcessingStepRoute = openApiProtectedRoute({
  description: 'Add a processing step to a request',
  responses: {
    ...openApiResponse(RequeteStateSchema),
  },
});

export const addProcessingStepNoteRoute = openApiProtectedRoute({
  description: 'Add a processing note to a step of a request',
  responses: {
    ...openApiResponse(RequeteStateNoteSchema),
  },
});

// TODO-act
export const getProcessingStepsRoute = openApiProtectedRoute({
  description: 'Get processing steps for a request',
  responses: {
    ...openApiResponses(RequeteStateSchema.array()),
  },
});
