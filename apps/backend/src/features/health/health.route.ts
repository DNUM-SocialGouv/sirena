import { openApiResponse } from '@sirena/backend-utils/helpers';
import { describeRoute } from 'hono-openapi';
import { HealthErrorResponseSchema, HealthResponseSchema } from './health.schema.js';

export const getHealthRoute = describeRoute({
  description: 'API health check',
  responses: {
    ...openApiResponse(HealthResponseSchema),
    ...openApiResponse(HealthErrorResponseSchema, 500, 'Internal Server Error'),
  },
});
