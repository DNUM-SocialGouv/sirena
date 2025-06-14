import { envVars } from '@/config/env';
import { getSession } from '@/features/sessions/sessions.service';
import factoryWithAuth from '@/helpers/factories/appWithAuth';
import type { AppBindings } from '@/helpers/factories/appWithAuth';
import { getJwtExpirationDate, isJwtError, verify } from '@/helpers/jsonwebtoken';
import { signAuthCookie } from '@/helpers/jsonwebtoken';
import type { Session } from '@/libs/prisma';
import { throwHTTPException401Unauthorized } from '@sirena/backend-utils/helpers';
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';

const cleanAnSendError = (c: Context<AppBindings>, error: unknown, errorMessage: string, errorResponse: string) => {
  const logger = c.get('logger');
  deleteCookie(c, envVars.REFRESH_TOKEN_NAME);
  deleteCookie(c, envVars.IS_LOGGED_TOKEN_NAME);
  logger.info({ err: error }, errorMessage);
  return throwHTTPException401Unauthorized(errorResponse);
};

const app = factoryWithAuth.createMiddleware(async (c, next) => {
  const logger = c.get('logger');

  const authToken = getCookie(c, envVars.AUTH_TOKEN_NAME);
  if (authToken) {
    try {
      const decoded = verify<{ id: string }>(authToken, envVars.AUTH_TOKEN_SECRET_KEY);
      c.set('userId', decoded.id);
      return next();
    } catch (error) {
      if (!isJwtError(error)) {
        logger.error({ err: error }, 'Error in auth token verification - not a JWT error');
      } else {
        logger.info({ err: error }, 'Error in auth token verification');
      }
    }
    deleteCookie(c, envVars.AUTH_TOKEN_NAME);
  }

  const refreshToken = getCookie(c, envVars.REFRESH_TOKEN_NAME);
  if (refreshToken) {
    let session: Session | null = null;
    try {
      session = await getSession(refreshToken);
    } catch (error) {
      cleanAnSendError(
        c,
        error,
        'Error in refresh token verification',
        'Unauthorized, Refresh token is invalid or expired',
      );
    }

    if (session === null) {
      deleteCookie(c, envVars.REFRESH_TOKEN_NAME);
      deleteCookie(c, envVars.IS_LOGGED_TOKEN_NAME);
      throwHTTPException401Unauthorized('Unauthorized, Refresh token is invalid or expired');
    }

    try {
      const decoded = verify<{ id: string }>(refreshToken, envVars.REFRESH_TOKEN_SECRET_KEY);
      const newAuthTokenDate = getJwtExpirationDate(envVars.AUTH_TOKEN_EXPIRATION);

      const newAuthToken = signAuthCookie(decoded.id, newAuthTokenDate);
      setCookie(c, envVars.AUTH_TOKEN_NAME, newAuthToken, {
        path: '/',
        secure: true,
        httpOnly: true,
        expires: newAuthTokenDate,
        sameSite: 'Strict',
      });
      c.set('userId', decoded.id);
      return next();
    } catch (error) {
      if (!isJwtError(error)) {
        logger.error({ err: error }, 'Error in auth token verification - not a JWT error');
        deleteCookie(c, envVars.REFRESH_TOKEN_NAME);
        deleteCookie(c, envVars.IS_LOGGED_TOKEN_NAME);
        throw error;
      }
      cleanAnSendError(
        c,
        error,
        'Error in refresh token verification',
        'Unauthorized, Refresh token is invalid or expired',
      );
    }
  } else {
    deleteCookie(c, envVars.IS_LOGGED_TOKEN_NAME);
    throwHTTPException401Unauthorized('Unauthorized, Refresh token is invalid or expired');
  }
});

export default app;
