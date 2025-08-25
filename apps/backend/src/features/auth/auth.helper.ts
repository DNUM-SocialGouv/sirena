import { AUTH_ERROR_CODES } from '@sirena/common/constants';
import type { Context } from 'hono';
import { setCookie } from 'hono/cookie';
import { envVars } from '@//config/env';
import { createSession } from '@/features/sessions/sessions.service';
import type { AppBindings } from '@/helpers/factories/appWithLogs';
import { getJwtExpirationDate, signAuthCookie, signRefreshCookie } from '@/helpers/jsonwebtoken';
import { isPrismaUniqueConstraintError } from '@/helpers/prisma';
import type { RoleEnum, User } from '@/libs/prisma';

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

type authUserParams = { id: User['id']; roleId: RoleEnum['id'] };

export const authUser = async (c: Context<AppBindings>, { id, roleId }: authUserParams, idToken: string) => {
  const authTokenExpirationDate = getJwtExpirationDate(envVars.AUTH_TOKEN_EXPIRATION);
  const refreshTokenExpirationDate = getJwtExpirationDate(envVars.REFRESH_TOKEN_EXPIRATION);

  const refreshToken = signRefreshCookie(id, refreshTokenExpirationDate);
  const authToken = signAuthCookie({ id, roleId }, authTokenExpirationDate);

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
      userId: id,
      token: refreshToken,
      pcIdToken: idToken,
      expiresAt: refreshTokenExpirationDate,
    });
  } catch (error) {
    const logger = c.get('logger');

    const errorCode = isPrismaUniqueConstraintError(error)
      ? AUTH_ERROR_CODES.SESSION_ALREADY_EXISTS
      : AUTH_ERROR_CODES.SESSION_CREATE_ERROR;

    logger.error({ err: error }, 'Error in creating new session in database');

    const errorPageUrl = createRedirectUrl({ error: errorCode });

    return c.redirect(errorPageUrl, 302);
  }
};
