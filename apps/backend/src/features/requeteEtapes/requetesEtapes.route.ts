import {
  openApiDeleteResponse,
  openApiProtectedRoute,
  openApiResponse,
  openApiResponses,
} from '@sirena/backend-utils/helpers';
import { z } from 'zod';
import { RequeteEtapeNoteSchema, RequeteEtapeSchema, RequeteEtapeWithDetailsSchema } from './requetesEtapes.schema.js';

export const addProcessingStepRoute = openApiProtectedRoute({
  description: 'Add a processing step to a request',
  responses: {
    ...openApiResponse(RequeteEtapeSchema),
  },
});

export const getProcessingStepsRoute = openApiProtectedRoute({
  description: 'Get processing steps for a request',
  responses: {
    ...openApiResponses(RequeteEtapeWithDetailsSchema),
  },
});

export const updateProcessingStepRoute = openApiProtectedRoute({
  description: 'Update a processing step (name, status, date, notes and files)',
  responses: {
    ...openApiResponse(RequeteEtapeSchema),
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

export const updateRequeteEtapeDateRealisationRoute = openApiProtectedRoute({
  description: 'Update the "dateRealisation" of a RequeteEtape',
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

export const sendAcknowledgmentRoute = openApiProtectedRoute({
  description: 'Send an acknowledgment email to the declarant for a manual request',
  responses: {
    ...openApiResponse(RequeteEtapeSchema),
  },
});
