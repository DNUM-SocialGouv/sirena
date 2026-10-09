import {
  openApi503Error,
  openApiDeleteResponse,
  openApiProtectedRoute,
  openApiResponse,
} from '@sirena/backend-utils/helpers';
import z from 'zod';
import { GetFileProcessingStatusResponseSchema, GetUploadedFileResponseSchema } from './uploadedFiles.schema.js';

export const createUploadedFileRoute = openApiProtectedRoute({
  description: 'Create uploaded file',
  responses: {
    ...openApiResponse(GetUploadedFileResponseSchema),
    ...openApi503Error('Le stockage des pièces jointes est momentanément indisponible'),
  },
});

export const deleteUploadedFileRoute = openApiProtectedRoute({
  description: 'Delete uploaded file by id',
  responses: {
    ...openApiDeleteResponse(z.string(), 204, 'Uploaded file deleted successfully'),
  },
});

export const getFileProcessingStatusRoute = openApiProtectedRoute({
  description: 'Get file processing status for polling',
  responses: {
    ...openApiResponse(GetFileProcessingStatusResponseSchema),
  },
});
