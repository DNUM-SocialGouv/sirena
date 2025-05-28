import { ErrorSchema, ZodSafeParseErrorSchema } from '@/schemas/apiErrors.schema';
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

export const throwHTTPException400BadRequest = (msg = MESSAGES.BAD_REQUEST) => {
  throw new HTTPException(400, { message: msg });
};

export const throwHTTPException401Unauthorized = (
  msg = MESSAGES.UNAUTHORIZED,
  cause?: { name?: string; message?: string; stack?: string },
) => {
  const params: { message: string; cause?: unknown } = { message: msg };
  if (cause) {
    params.cause = cause;
  }
  throw new HTTPException(401, params);
};

export const throwHTTPException403Forbidden = (msg = MESSAGES.FORBIDDEN) => {
  throw new HTTPException(403, { message: msg });
};

export const throwHTTPException404NotFound = (msg = MESSAGES.NOT_FOUND) => {
  throw new HTTPException(404, { message: msg });
};

export const throwHTTPException503ServiceUnavailable = (msg = MESSAGES.NOT_FOUND) => {
  throw new HTTPException(503, { message: msg });
};

export const apiErrorResolver = (): ResolverResult => resolver(ErrorSchema);
export const apiZodErrorResolver = (): ResolverResult => resolver(ZodSafeParseErrorSchema);

export const openApi401Unauthorized = (description = MESSAGES.BAD_REQUEST) => ({
  401: {
    description,
    content: {
      'application/json': { schema: apiErrorResolver() },
    },
  },
});

export const openApi400BadRequest = (description = MESSAGES.BAD_REQUEST) => ({
  400: {
    description,
    content: {
      'application/json': { schema: apiErrorResolver() },
    },
  },
});

export const openApi400ZodError = (description = MESSAGES.ZOD_ERROR) => ({
  400: {
    description,
    content: {
      'application/json': { schema: apiZodErrorResolver() },
    },
  },
});

export const openApi503Error = (description = MESSAGES.SERVICE_NOT_AVAILABLE) => ({
  503: {
    description,
    content: {
      'application/json': { schema: apiErrorResolver() },
    },
  },
});

export const openApi403Forbidden = (description = MESSAGES.FORBIDDEN) => ({
  403: {
    description,
    content: {
      'application/json': { schema: apiErrorResolver() },
    },
  },
});
export const openApi404NotFound = (description = MESSAGES.NOT_FOUND) => ({
  404: {
    description,
    content: {
      'application/json': { schema: apiErrorResolver() },
    },
  },
});
