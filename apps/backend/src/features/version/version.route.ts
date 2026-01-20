import { openApiResponse } from '@sirena/backend-utils/helpers';
import { describeRoute } from 'hono-openapi';
import { VersionResponseSchema } from './version.schema.js';

export const getVersionRoute = describeRoute({
  description: 'API version',
  responses: {
    ...openApiResponse(VersionResponseSchema),
  },
});
