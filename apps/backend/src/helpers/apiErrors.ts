import { ErrorSchema, ZodSafeParseErrorSchema } from '@/schemas/apiErrors.schema.ts';
import type { ResolverResult } from 'hono-openapi';
import { resolver } from 'hono-openapi/zod';
import { HTTPException } from 'hono/http-exception';

const MESSAGES = {
  BAD_REQUEST: 'Bad request',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Not found',
  ZOD_ERROR: 'Zod error',
  SERVICE_NOT_AVAILABLE: 'Service not available',
};

export const HTTPException400BadRequest = (msg = MESSAGES.BAD_REQUEST) => new HTTPException(400, { message: msg });

export const HTTPException401Unauthorized = (
  msg = MESSAGES.UNAUTHORIZED,
  cause?: { name?: string; message?: string; stack?: string },
) => {
  const params: { message: string; cause?: unknown } = { message: msg };
  if (cause) {
    params.cause = cause;
  }
  return new HTTPException(401, params);
};

export const HTTPException403Forbidden = (msg = MESSAGES.FORBIDDEN) => new HTTPException(403, { message: msg });

export const HTTPException404NotFound = (msg = MESSAGES.NOT_FOUND) => new HTTPException(404, { message: msg });

export const HTTPException503ServiceUnavailable = (msg = MESSAGES.NOT_FOUND) =>
  new HTTPException(503, { message: msg });

export const ApiErrorSchema = (): ResolverResult => resolver(ErrorSchema);
export const ApiZodErrorSchema = (): ResolverResult => resolver(ZodSafeParseErrorSchema);

export const OpenApi401Unauthorized = (description = MESSAGES.BAD_REQUEST) => ({
  401: {
    description,
    content: {
      'application/json': { schema: ApiErrorSchema() },
    },
  },
});

export const OpenApi400BadRequest = (description = MESSAGES.BAD_REQUEST) => ({
  400: {
    description,
    content: {
      'application/json': { schema: ApiErrorSchema() },
    },
  },
});

export const OpenApi400ZodError = (description = MESSAGES.ZOD_ERROR) => ({
  400: {
    description,
    content: {
      'application/json': { schema: ApiZodErrorSchema() },
    },
  },
});

export const OpenApi503Error = (description = MESSAGES.SERVICE_NOT_AVAILABLE) => ({
  503: {
    description,
    content: {
      'application/json': { schema: ApiErrorSchema() },
    },
  },
});

export const OpenApi403Forbidden = (description = MESSAGES.FORBIDDEN) => ({
  403: {
    description,
    content: {
      'application/json': { schema: ApiErrorSchema() },
    },
  },
});
export const OpenApi404NotFound = (description = MESSAGES.NOT_FOUND) => ({
  404: {
    description,
    content: {
      'application/json': { schema: ApiErrorSchema() },
    },
  },
});
export const OpenApi302Redirect = () => ({
  302: {
    content: {},
  },
});
