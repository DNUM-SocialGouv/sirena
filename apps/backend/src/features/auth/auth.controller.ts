import { ERROR_CODES } from '@/config/authErrors.constants.ts';
import { envVars } from '@/config/env.ts';
import authMiddleware from '@/features/auth/auth.middleware.ts';
import { createSession, deleteSession, getSession } from '@/features/sessions/sessions.service.ts';
import { createUser, getUserBySub } from '@/features/users/users.service.ts';
import factoryWithLogs from '@/helpers/factories/appWithLogs.ts';
import { signAuthCookie, signRefreshCookie } from '@/helpers/jsonwebtoken.ts';
import { getJwtExpirationDate } from '@/helpers/jsonwebtoken.ts';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { TokenEndpointResponse, TokenEndpointResponseHelpers, UserInfoResponse } from 'openid-client';
import { createRedirectUrl } from './auth.helper.ts';
import { authorizationCodeGrant, buildAuthorizationUrl, buildEndSessionUrl, fetchUserInfo } from './auth.service.ts';

const app = factoryWithLogs
  .createApp()

  .post('/login', async (c) => {
    let redirectTo: URL;
    let nonce: string;
    let state: string;

    try {
      const authorizationUrl = await buildAuthorizationUrl();
      redirectTo = authorizationUrl.redirectTo;
      nonce = authorizationUrl.nonce;
      state = authorizationUrl.state;
    } catch (error) {
      const logger = c.get('logger');
      logger.error({ err: error }, 'Error in buildAuthorizationUrl');
      const url = createRedirectUrl({ error: ERROR_CODES.PC_ERROR });
      return c.redirect(url, 302);
    }

    setCookie(c, 'state', state, { path: '/', httpOnly: true });
    setCookie(c, 'nonce', nonce, { path: '/', httpOnly: true });

    return c.redirect(redirectTo.href, 302);
  })

  .get('/callback', async (c) => {
    const oldUrl = new URL(c.req.url);
    const updatedUrl = new URL(envVars.PC_REDIRECT_URI);

    oldUrl.searchParams.forEach((value, key) => {
      updatedUrl.searchParams.set(key, value);
    });

    const logger = c.get('logger');

    const error = c.req.query('error');

    if (error) {
      logger.error({ err: error }, 'Error in callback from PC');
      const url = createRedirectUrl({ error: ERROR_CODES.PC_ERROR, errorDescription: error });
      return c.redirect(url, 302);
    }

    const state = getCookie(c, 'state');
    const nonce = getCookie(c, 'nonce');

    if (!state || !nonce) {
      logger.error('Error in callback from PC, state is missing from user cookie');
      const url = createRedirectUrl({ error: ERROR_CODES.STATE_NOT_VALID });
      return c.redirect(url, 302);
    }

    deleteCookie(c, 'state');
    deleteCookie(c, 'nonce');

    let tokens: TokenEndpointResponse & TokenEndpointResponseHelpers;

    try {
      tokens = await authorizationCodeGrant(updatedUrl, state, nonce);
    } catch (error) {
      logger.error({ err: error }, 'Error in callback from PC, tokens are missing');
      const url = createRedirectUrl({ error: ERROR_CODES.TOKENS_NOT_VALID });
      return c.redirect(url, 302);
    }

    if (!tokens.id_token || !tokens.refresh_token) {
      logger.error('Error in callback from PC, state is missing from storage states');
      const url = createRedirectUrl({ error: ERROR_CODES.TOKENS_NOT_VALID });
      return c.redirect(url, 302);
    }

    const claims = tokens.claims();
    if (!claims) {
      logger.error('Error in callback from PC, claims are missing from tokens');
      const url = createRedirectUrl({ error: ERROR_CODES.CLAIMS_NOT_VALID });
      return c.redirect(url, 302);
    }

    let userInfo: UserInfoResponse;
    try {
      userInfo = await fetchUserInfo(tokens.access_token, claims);
    } catch (error) {
      logger.error({ err: error }, 'Error in callback from PC, userInfo is missing from tokens');
      const url = createRedirectUrl({ error: ERROR_CODES.USER_INFOS_ERROR });
      return c.redirect(url, 302);
    }

    if (!userInfo.email || !userInfo.given_name || !userInfo.usual_name || !userInfo.sub || !userInfo.uid) {
      // TODO : Check RGPD
      logger.error({ userInfo }, 'Error in callback from PC, userInfo are missing elements');
      const url = createRedirectUrl({ error: ERROR_CODES.CLAIMS_NOT_VALID });
      return c.redirect(url, 302);
    }

    let user = await getUserBySub(userInfo.sub);

    if (!user) {
      try {
        user = await createUser({
          sub: userInfo.sub,
          uid: String(userInfo.uid),
          email: userInfo.email,
          firstName: userInfo.given_name,
          lastName: String(userInfo.usual_name),
        });
      } catch (error) {
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
          logger.error({ err: error }, 'Error in creating new user in database, email already exists');
          const url = createRedirectUrl({ error: ERROR_CODES.USER_ALREADY_EXISTS });
          return c.redirect(url, 302);
        }
        logger.error({ err: error }, 'Error in creating new user in database');
        const url = createRedirectUrl({ error: ERROR_CODES.USER_INFOS_ERROR });
        return c.redirect(url, 302);
      }
    }
    const authTokenExpirationDate = getJwtExpirationDate(envVars.AUTH_TOKEN_EXPIRATION);
    const refreshTokenExpirationDate = getJwtExpirationDate(envVars.REFRESH_TOKEN_EXPIRATION);

    const refreshToken = signRefreshCookie(user.id, refreshTokenExpirationDate);
    const authToken = signAuthCookie(user.id, authTokenExpirationDate);

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

    await createSession({
      userId: user.id,
      token: refreshToken,
      pcIdToken: tokens.id_token,
      expiresAt: refreshTokenExpirationDate,
    });

    return c.redirect(envVars.FRONTEND_REDIRECT_URI, 302);
  })

  .use(authMiddleware)

  .post('/logout', async (c) => {
    const token = getCookie(c, envVars.REFRESH_TOKEN_NAME);

    deleteCookie(c, envVars.AUTH_TOKEN_NAME);
    deleteCookie(c, envVars.REFRESH_TOKEN_NAME);
    deleteCookie(c, envVars.IS_LOGGED_TOKEN_NAME);

    if (token) {
      await deleteSession(token);
    }

    return c.redirect(envVars.FRONTEND_REDIRECT_LOGIN_URI, 302);
  })

  .post('/logout-proconnect', async (c) => {
    const token = getCookie(c, envVars.REFRESH_TOKEN_NAME);

    deleteCookie(c, envVars.AUTH_TOKEN_NAME);
    deleteCookie(c, envVars.REFRESH_TOKEN_NAME);
    deleteCookie(c, envVars.IS_LOGGED_TOKEN_NAME);

    if (!token) {
      return c.redirect(envVars.FRONTEND_REDIRECT_LOGIN_URI, 302);
    }

    const session = await getSession(token);

    if (!session) {
      return c.redirect(envVars.FRONTEND_REDIRECT_LOGIN_URI, 302);
    }

    let endSessionUrl: URL;

    try {
      endSessionUrl = await buildEndSessionUrl(session.pcIdToken);
    } catch (error) {
      const logger = c.get('logger');
      logger.error({ err: error }, 'Error in buildEndSessionUrl');
      const url = createRedirectUrl({ error: ERROR_CODES.PC_ERROR });
      return c.redirect(url, 302);
    }

    await deleteSession(token);

    return c.redirect(endSessionUrl, 302);
  });

export default app;
