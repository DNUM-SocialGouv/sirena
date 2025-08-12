import {
  openApi404NotFound,
  openApiProtectedRoute,
  openApiResponse,
  openApiResponses,
} from '@sirena/backend-utils/helpers';
import { GetUploadedFileResponseSchema, GetUploadedFilesResponseSchema } from './uploadedFiles.schema';

export const getUploadedFileRoute = openApiProtectedRoute({
  description: 'Get uploaded file by id',
  responses: {
    ...openApiResponse(GetUploadedFileResponseSchema),
    ...openApi404NotFound('Uploaded file not found'),
  },
});

export const getUploadedFilesRoute = openApiProtectedRoute({
  description: 'Get all uploaded files',
  responses: {
    ...openApiResponses(GetUploadedFilesResponseSchema),
  },
});

export const createUploadedFileRoute = openApiProtectedRoute({
  description: 'Create uploaded file',
  responses: {
    ...openApiResponse(GetUploadedFileResponseSchema),
  },
});

export const getUploadedFileSignedUrlRoute = openApiProtectedRoute({
  description: 'Get signed url for uploaded file by id',
  responses: {
    ...openApiResponse(GetUploadedFileResponseSchema),
    ...openApi404NotFound('Uploaded file not found'),
  },
});
