import { describeRoute, resolver, validator } from 'hono-openapi';
import { MAX_FILE_SIZE } from '../../../config/files.constant.js';
import { formatMaxSize } from '../../../middlewares/bodyLimit.middleware.js';
import {
  AddAttachmentResponseSchema,
  AttachmentParamsSchema,
  CreateRequeteRequestSchema,
  CreateRequeteResponseSchema,
} from './requetes.schema.js';
import {
  MAX_JSON_BODY_SIZE,
  thirdPartyCommonErrorResponses,
  thirdPartyErrorResponse,
  traceIdHeader,
} from './shared.js';

const payloadTooLargeResponse = (maxSize: number) =>
  thirdPartyErrorResponse(
    `Request body larger than ${formatMaxSize(maxSize)} (\`BODY_MAX_SIZE\`). When a Content-Length header is ` +
      'sent, the request is rejected before its body is read.',
  );

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
    413: payloadTooLargeResponse(MAX_JSON_BODY_SIZE),
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
    400: thirdPartyErrorResponse(
      'Invalid multipart body, missing file, file type not allowed (`FILE_TYPE`) or file larger than ' +
        `${formatMaxSize(MAX_FILE_SIZE)} (\`FILE_MAX_SIZE\`). The size check is done while streaming: when the request ` +
        'has no Content-Length (chunked transfer), the upload is cut as soon as the limit is exceeded.',
    ),
    404: thirdPartyErrorResponse('Requete not found or not owned by this account'),
    413: payloadTooLargeResponse(MAX_FILE_SIZE),
    503: thirdPartyErrorResponse('Attachment storage temporarily unavailable (`STORAGE_UNAVAILABLE`), retry later'),
    ...thirdPartyCommonErrorResponses,
  },
});
