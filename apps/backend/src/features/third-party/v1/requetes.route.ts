import { describeRoute, resolver, validator } from 'hono-openapi';
import {
  AddAttachmentResponseSchema,
  AttachmentParamsSchema,
  CreateRequeteRequestSchema,
  CreateRequeteResponseSchema,
} from './requetes.schema.js';
import { thirdPartyCommonErrorResponses, thirdPartyErrorResponse, traceIdHeader } from './shared.js';

export const postCreateRequeteValidator = validator('json', CreateRequeteRequestSchema);

export const postCreateRequeteRoute = describeRoute({
  description: 'Create a new request (Requete) with all related elements and relations',
  tags: ['Third-Party', 'Requetes'],
  responses: {
    200: {
      description: 'Request created successfully',
      headers: traceIdHeader,
      content: {
        'application/json': { schema: resolver(CreateRequeteResponseSchema) },
      },
    },
    400: thirdPartyErrorResponse('Invalid request payload - validation error'),
    ...thirdPartyCommonErrorResponses,
  },
});

export const postAttachmentParamsValidator = validator('param', AttachmentParamsSchema);

export const postAttachmentRoute = describeRoute({
  description: 'Add an attachment to a previously created requete owned by the calling third-party account',
  tags: ['Third-Party', 'Requetes'],
  responses: {
    200: {
      description: 'Attachment uploaded successfully',
      headers: traceIdHeader,
      content: {
        'application/json': { schema: resolver(AddAttachmentResponseSchema) },
      },
    },
    400: thirdPartyErrorResponse('Invalid file or missing file'),
    404: thirdPartyErrorResponse('Requete not found or not owned by this account'),
    ...thirdPartyCommonErrorResponses,
  },
});
