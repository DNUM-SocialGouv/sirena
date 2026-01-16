import {
  openApiDeleteResponse,
  openApiProtectedRoute,
  openApiResponse,
  openApiResponses,
} from '@sirena/backend-utils/helpers';
import { z } from 'zod';
import { RequeteEtapeNoteSchema, RequeteEtapeSchema } from './requetesEtapes.schema';

export const addProcessingStepRoute = openApiProtectedRoute({
  description: 'Add a processing step to a request',
  responses: {
    ...openApiResponse(RequeteEtapeSchema),
  },
});

export const getProcessingStepsRoute = openApiProtectedRoute({
  description: 'Get processing steps for a request',
  responses: {
    ...openApiResponses(RequeteEtapeSchema),
  },
});

export const addProcessingStepNoteRoute = openApiProtectedRoute({
  description: 'Add a processing note to a step of a request',
  responses: {
    ...openApiResponse(RequeteEtapeNoteSchema),
  },
});

export const updateRequeteEtapeStatutRoute = openApiProtectedRoute({
  description: 'Update the statut of a RequeteEtape',
  responses: {
    ...openApiResponse(RequeteEtapeSchema),
  },
});

export const updateRequeteEtapeNomRoute = openApiProtectedRoute({
  description: 'Update the "nom" of a RequeteEtape',
  responses: {
    ...openApiResponse(RequeteEtapeSchema),
  },
});

export const deleteRequeteEtapeRoute = openApiProtectedRoute({
  description: 'Delete a RequeteEtape and all its associated notes and files',
  responses: {
    ...openApiDeleteResponse(z.string(), 204, 'RequeteEtape deleted successfully'),
  },
});
