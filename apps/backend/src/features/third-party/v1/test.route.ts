import { describeRoute, resolver } from 'hono-openapi';
import { TestErrorResponseSchema, TestResponseSchema } from './test.schema.js';

const traceIdHeader = {
  'x-trace-id': {
    description: 'Request trace ID for debugging and support',
    schema: { type: 'string' },
  },
} as const;

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
    401: {
      description: 'Invalid or missing API key',
      headers: traceIdHeader,
      content: {
        'application/json': { schema: resolver(TestErrorResponseSchema) },
      },
    },
  },
});
