import { throwHTTPException401Unauthorized } from '@sirena/backend-utils/helpers';
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { envVars } from '@/config/env';
import { getSession } from '@/features/sessions/sessions.service';
import { getUserById } from '@/features/users/users.service';
import type { AppBindings } from '@/helpers/factories/appWithAuth';
import factoryWithAuth from '@/helpers/factories/appWithAuth';
import { getJwtExpirationDate, isJwtError, signAuthCookie, verify } from '@/helpers/jsonwebtoken';
import type { Session } from '@/libs/prisma';

const cleanAnSendError = (c: Context<AppBindings>, error: unknown, errorMessage: string, errorResponse: string) => {
  const logger = c.get('logger');
  deleteCookie(c, envVars.REFRESH_TOKEN_NAME);
  deleteCookie(c, envVars.IS_LOGGED_TOKEN_NAME);
  logger.info({ err: error }, errorMessage);
  throwHTTPException401Unauthorized(errorResponse, { res: c.res });
};

const app = factoryWithAuth.createMiddleware(async (c, next) => {
  const logger = c.get('logger');

  const authToken = getCookie(c, envVars.AUTH_TOKEN_NAME);
  if (authToken) {
    try {
      const decoded = verify<{ id: string; roleId: string }>(authToken, envVars.AUTH_TOKEN_SECRET_KEY);
      c.set('userId', decoded.id);
      c.set('roleId', decoded.roleId);
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
      throwHTTPException401Unauthorized('Unauthorized, Refresh token is invalid or expired', { res: c.res });
    }

    try {
      const decoded = verify<{ id: string; roleId: string }>(refreshToken, envVars.REFRESH_TOKEN_SECRET_KEY);
      const newAuthTokenDate = getJwtExpirationDate(envVars.AUTH_TOKEN_EXPIRATION);
      const user = await getUserById(decoded.id, null);
      if (!user) {
        throw new Error(`User with ID ${decoded.id} not found`);
      }
      const roleId = user.roleId;
      const newAuthToken = signAuthCookie({ id: decoded.id, roleId }, newAuthTokenDate);
      setCookie(c, envVars.AUTH_TOKEN_NAME, newAuthToken, {
        path: '/',
        secure: true,
        httpOnly: true,
        expires: newAuthTokenDate,
        sameSite: 'Strict',
      });
      c.set('userId', decoded.id);
      c.set('roleId', roleId);
      return next();
    } catch (error) {
      if (!isJwtError(error)) {
        logger.error({ err: error }, 'Error in auth token verification - not a JWT error');
        deleteCookie(c, envVars.REFRESH_TOKEN_NAME);
        deleteCookie(c, envVars.IS_LOGGED_TOKEN_NAME);
        throwHTTPException401Unauthorized('Unauthorized, Refresh token is invalid or expired', { res: c.res });
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
    throwHTTPException401Unauthorized('Unauthorized, Refresh token is invalid or expired', { res: c.res });
  }
});

export default app;
