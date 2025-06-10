import { envVars } from '@//config/env';
import { createSession } from '@/features/sessions/sessions.service';
import type { AppBindings } from '@/helpers/factories/appWithLogs';
import { getJwtExpirationDate, signAuthCookie, signRefreshCookie } from '@/helpers/jsonwebtoken';
import { isPrismaUniqueConstraintError } from '@/helpers/prisma';
import { ERROR_CODES } from '@sirena/common/constants';
import type { Context } from 'hono';
import { setCookie } from 'hono/cookie';

type ErrorParams = {
  error: string;
  errorDescription?: string;
};

export const createRedirectUrl = ({ error, errorDescription }: ErrorParams) => {
  const url = new URL(envVars.FRONTEND_REDIRECT_LOGIN_URI);
  url.searchParams.set('error', error);
  if (errorDescription) {
    url.searchParams.set('error_description', errorDescription);
  }
  return url;
};

export const authUser = async (c: Context<AppBindings>, userId: string, idToken: string) => {
  const authTokenExpirationDate = getJwtExpirationDate(envVars.AUTH_TOKEN_EXPIRATION);
  const refreshTokenExpirationDate = getJwtExpirationDate(envVars.REFRESH_TOKEN_EXPIRATION);

  const refreshToken = signRefreshCookie(userId, refreshTokenExpirationDate);
  const authToken = signAuthCookie(userId, authTokenExpirationDate);

  setCookie(c, envVars.AUTH_TOKEN_NAME, authToken, {
    path: '/',
    secure: true,
    httpOnly: true,
    expires: authTokenExpirationDate,
    sameSite: 'Strict',
  });

  setCookie(c, envVars.REFRESH_TOKEN_NAME, refreshToken, {
    path: '/',
    secure: true,
    httpOnly: true,
    expires: refreshTokenExpirationDate,
    sameSite: 'Strict',
  });

  setCookie(c, envVars.IS_LOGGED_TOKEN_NAME, 'true', {
    path: '/',
    secure: true,
    expires: refreshTokenExpirationDate,
    sameSite: 'Strict',
  });

  try {
    await createSession({
      userId: userId,
      token: refreshToken,
      pcIdToken: idToken,
      expiresAt: refreshTokenExpirationDate,
    });
  } catch (error) {
    const logger = c.get('logger');
    if (isPrismaUniqueConstraintError(error)) {
      logger.error({ err: error }, 'Error in creating new session in database');
      const errorPageUrl = createRedirectUrl({ error: ERROR_CODES.SESSION_ALREADY_EXISTS });
      return c.redirect(errorPageUrl, 302);
    }
    logger.error({ err: error }, 'Error in creating new session in database');
    const errorPageUrl = createRedirectUrl({ error: ERROR_CODES.SESSION_CREATE_ERROR });
    return c.redirect(errorPageUrl, 302);
  }
};
