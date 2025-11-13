import { openApiDeleteResponse, openApiProtectedRoute, openApiResponse } from '@sirena/backend-utils/helpers';
import z from 'zod';
import { GetUploadedFileResponseSchema } from './uploadedFiles.schema';

export const createUploadedFileRoute = openApiProtectedRoute({
  description: 'Create uploaded file',
  responses: {
    ...openApiResponse(GetUploadedFileResponseSchema),
  },
});

export const deleteUploadedFileRoute = openApiProtectedRoute({
  description: 'Delete uploaded file by id',
  responses: {
    ...openApiDeleteResponse(z.string(), 204, 'Uploaded file deleted successfully'),
  },
});
