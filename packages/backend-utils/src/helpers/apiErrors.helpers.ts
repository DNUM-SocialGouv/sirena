import type { ResolverResult } from 'hono-openapi';
import { resolver } from 'hono-openapi/zod';
import { HTTPException } from 'hono/http-exception';
import { ErrorSchema, ZodSafeParseErrorSchema } from '../schemas/apiErrors.schema';

type ErrorOptions = {
  cause?: { name?: string; message?: string; stack?: string };
  res?: Response;
};

const MESSAGES = {
  BAD_REQUEST: 'Bad request',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Not found',
  ZOD_ERROR: 'Zod error',
  SERVICE_NOT_AVAILABLE: 'Service not available',
};

const getParamsOptions = (status: number, message: string, options?: ErrorOptions) => {
  const params: { message: string; cause?: unknown } = { message };
  if (options?.cause) {
    params.cause = options.cause;
  }

  let res: Response;
  if (options?.res) {
    res = new Response(JSON.stringify({ ...params }), {
      status,
      headers: {
        ...Object.fromEntries(options.res.headers),
        'Content-Type': 'application/json',
      },
    });
  } else {
    res = new Response(JSON.stringify({ ...params }), {
      status: status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  return { ...params, res };
};

export const throwHTTPException400BadRequest = (msg = MESSAGES.BAD_REQUEST, options?: ErrorOptions) => {
  const status = 400;
  const params = getParamsOptions(status, msg, options);
  throw new HTTPException(status, params);
};

export const throwHTTPException401Unauthorized = (msg = MESSAGES.UNAUTHORIZED, options?: ErrorOptions) => {
  const status = 401;
  const params = getParamsOptions(status, msg, options);
  throw new HTTPException(status, params);
};

export const throwHTTPException403Forbidden = (msg = MESSAGES.FORBIDDEN, options?: ErrorOptions) => {
  const status = 403;
  const params = getParamsOptions(status, msg, options);
  throw new HTTPException(status, params);
};

export const throwHTTPException404NotFound = (msg = MESSAGES.NOT_FOUND, options?: ErrorOptions) => {
  const status = 404;
  const params = getParamsOptions(status, msg, options);
  throw new HTTPException(status, params);
};

export const throwHTTPException503ServiceUnavailable = (
  msg = MESSAGES.SERVICE_NOT_AVAILABLE,
  options?: ErrorOptions,
) => {
  const status = 503;
  const params = getParamsOptions(status, msg, options);
  throw new HTTPException(status, params);
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
