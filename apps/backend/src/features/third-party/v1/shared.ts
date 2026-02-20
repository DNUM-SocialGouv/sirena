import { resolver } from 'hono-openapi';
import { z } from 'zod';

export const traceIdHeader = {
  'x-trace-id': {
    description: 'Request trace ID for debugging and support',
    schema: { type: 'string' },
  },
} as const;

export const ThirdPartyErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    traceId: z.string(),
    details: z.record(z.string(), z.any()).optional(),
    retryAfter: z.number().optional(),
  }),
});

export type ThirdPartyErrorResponse = z.infer<typeof ThirdPartyErrorResponseSchema>;

const resolvedErrorSchema = resolver(ThirdPartyErrorResponseSchema);

type ErrorResponseDescriptor = {
  description: string;
  headers: typeof traceIdHeader;
  content: {
    'application/json': { schema: Record<string, unknown> };
  };
};

export const thirdPartyErrorResponse = (description: string): ErrorResponseDescriptor => ({
  description,
  headers: traceIdHeader,
  content: {
    'application/json': { schema: resolvedErrorSchema },
  },
});

export const thirdPartyCommonErrorResponses: Record<number, ErrorResponseDescriptor> = {
  401: thirdPartyErrorResponse('Invalid or missing API key'),
  403: thirdPartyErrorResponse('API key revoked, suspended, or expired'),
  429: thirdPartyErrorResponse('Too many requests'),
  500: thirdPartyErrorResponse('Internal server error'),
};
