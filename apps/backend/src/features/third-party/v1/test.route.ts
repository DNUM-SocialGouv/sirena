import { describeRoute, resolver } from 'hono-openapi';
import { thirdPartyCommonErrorResponses, traceIdHeader } from './shared.js';
import { TestResponseSchema } from './test.schema.js';

export const getTestRoute = describeRoute({
  description: 'Test endpoint for third-party API authentication',
  tags: ['Third-Party'],
  responses: {
    200: {
      description: 'Successful authentication',
      headers: traceIdHeader,
      content: {
        'application/json': { schema: resolver(TestResponseSchema) },
      },
    },
    ...thirdPartyCommonErrorResponses,
  },
});
