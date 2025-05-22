import { envVars } from '@/config/env.ts';
import { getSession } from '@/features/sessions/sessions.service.ts';
import { HTTPException401Unauthorized } from '@/helpers/apiErrors.ts';
import factoryWithAuth from '@/helpers/factories/appWithAuth.ts';
import { getJwtExpirationDate, verify } from '@/helpers/jsonwebtoken.ts';
import { signAuthCookie } from '@/helpers/jsonwebtoken.ts';
import type { Session } from '@sirena/database';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';

const app = factoryWithAuth.createMiddleware(async (c, next) => {
  const logger = c.get('logger');

  const authToken = getCookie(c, envVars.AUTH_TOKEN_NAME);
  if (authToken) {
    try {
      const [err, decoded] = verify<{ id: string }>(authToken, envVars.AUTH_TOKEN_SECRET_KEY);
      if (!err) {
        c.set('userId', decoded.id);
        return next();
      }
    } catch (error) {
      // Continue, try with refresh token
      logger.error({ err: error }, 'Error in auth token verification');
    }
    deleteCookie(c, envVars.AUTH_TOKEN_NAME);
  }

  const refreshToken = getCookie(c, envVars.REFRESH_TOKEN_NAME);
  if (refreshToken) {
    let session: Session | null = null;
    try {
      session = await getSession(refreshToken);
      if (session === null) {
        deleteCookie(c, envVars.REFRESH_TOKEN_NAME);
        deleteCookie(c, envVars.IS_LOGGED_TOKEN_NAME);
        throw HTTPException401Unauthorized('Unauthorized, Refresh token is invalid or expired');
      }
    } catch (error) {
      deleteCookie(c, envVars.REFRESH_TOKEN_NAME);
      deleteCookie(c, envVars.IS_LOGGED_TOKEN_NAME);
      logger.error({ err: error }, 'Error in refresh token verification');
      throw HTTPException401Unauthorized('Unauthorized');
    }

    try {
      const [err, decoded] = verify<{ id: string }>(session.token, envVars.REFRESH_TOKEN_SECRET_KEY);
      if (err) {
        deleteCookie(c, envVars.REFRESH_TOKEN_NAME);
        deleteCookie(c, envVars.IS_LOGGED_TOKEN_NAME);
        throw HTTPException401Unauthorized('Unauthorized, Refresh token is invalid or expired');
      }

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
      logger.error({ err: error }, 'Error in refresh token verification');
      deleteCookie(c, envVars.IS_LOGGED_TOKEN_NAME);
      deleteCookie(c, envVars.REFRESH_TOKEN_NAME);
      throw HTTPException401Unauthorized('Refresh token is invalid or expired');
    }
  } else {
    deleteCookie(c, envVars.IS_LOGGED_TOKEN_NAME);
    throw HTTPException401Unauthorized('Unauthorized, Refresh token is invalid or expired');
  }
});

export default app;
