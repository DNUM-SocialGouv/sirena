import { AUTH_ERROR_CODES } from '@sirena/common/constants';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { TokenEndpointResponse, TokenEndpointResponseHelpers, UserInfoResponse } from 'openid-client';
import { envVars } from '@/config/env';
import { deleteSession, getSession } from '@/features/sessions/sessions.service';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import { getPropertyTypes } from '@/helpers/logs';
import { isPrismaUniqueConstraintError } from '@/helpers/prisma';
import type { User } from '@/libs/prisma';
import logoutMiddleware from '@/middlewares/logout.middleware';
import { authUser, createRedirectUrl } from './auth.helper';
import { getCallbackRoute, postLoginRoute, postLogoutProconnectRoute, postLogoutRoute } from './auth.route';
import {
  authorizationCodeGrant,
  buildAuthorizationUrl,
  buildEndSessionUrl,
  fetchUserInfo,
  getOrCreateUser,
} from './auth.service';

const app = factoryWithLogs
  .createApp()

  .post('/login', postLoginRoute, async (c) => {
    const logger = c.get('logger');
    let redirectTo: URL;
    let nonce: string;
    let state: string;

    try {
      const authorizationUrl = await buildAuthorizationUrl();
      redirectTo = authorizationUrl.redirectTo;
      nonce = authorizationUrl.nonce;
      state = authorizationUrl.state;
      logger.info('Authorization URL generated successfully');
    } catch (error) {
      logger.error({ err: error }, 'Error in buildAuthorizationUrl');
      const errorPageUrl = createRedirectUrl({ error: AUTH_ERROR_CODES.PC_ERROR });
      return c.redirect(errorPageUrl, 302);
    }

    setCookie(c, 'state', state, { path: '/', httpOnly: true });
    setCookie(c, 'nonce', nonce, { path: '/', httpOnly: true });
    logger.info('OAuth state and nonce cookies set');

    return c.redirect(redirectTo.href, 302);
  })

  .get('/callback', getCallbackRoute, async (c) => {
    const oldUrl = new URL(c.req.url);
    const updatedUrl = new URL(envVars.PC_REDIRECT_URI);

    oldUrl.searchParams.forEach((value, key) => {
      updatedUrl.searchParams.set(key, value);
    });

    const logger = c.get('logger');
    logger.info('OAuth callback received from ProConnect');

    const error = c.req.query('error');

    if (error) {
      logger.error({ err: error }, 'Error in callback from PC');
      const errorPageUrl = createRedirectUrl({ error: AUTH_ERROR_CODES.PC_ERROR, errorDescription: error });
      return c.redirect(errorPageUrl, 302);
    }

    const state = getCookie(c, 'state');
    const nonce = getCookie(c, 'nonce');

    if (!state || !nonce) {
      logger.error('Error in callback from PC, state is missing from user cookie');
      const errorPageUrl = createRedirectUrl({ error: AUTH_ERROR_CODES.STATE_NOT_VALID });
      return c.redirect(errorPageUrl, 302);
    }

    deleteCookie(c, 'state');
    deleteCookie(c, 'nonce');

    let tokens: TokenEndpointResponse & TokenEndpointResponseHelpers;

    try {
      tokens = await authorizationCodeGrant(updatedUrl, state, nonce);
      logger.info('OAuth tokens obtained successfully');
    } catch (error) {
      logger.error({ err: error }, 'Error in callback from PC, tokens are missing');
      const errorPageUrl = createRedirectUrl({ error: AUTH_ERROR_CODES.TOKENS_NOT_VALID });
      return c.redirect(errorPageUrl, 302);
    }

    if (!tokens.id_token || !tokens.refresh_token) {
      logger.error('Error in callback from PC, state is missing from storage states');
      const errorPageUrl = createRedirectUrl({ error: AUTH_ERROR_CODES.TOKENS_NOT_VALID });
      return c.redirect(errorPageUrl, 302);
    }

    const claims = tokens.claims();
    if (!claims) {
      logger.error('Error in callback from PC, claims are missing from tokens');
      const errorPageUrl = createRedirectUrl({ error: AUTH_ERROR_CODES.CLAIMS_NOT_VALID });
      return c.redirect(errorPageUrl, 302);
    }

    let userInfo: UserInfoResponse;
    try {
      userInfo = await fetchUserInfo(tokens.access_token, claims);
      logger.info('User info retrieved from ProConnect');
    } catch (error) {
      logger.error({ err: error }, 'Error in callback from PC, userInfo is missing from tokens');
      const errorPageUrl = createRedirectUrl({ error: AUTH_ERROR_CODES.USER_INFOS_ERROR });
      return c.redirect(errorPageUrl, 302);
    }

    if (!userInfo.email || !userInfo.given_name || !userInfo.usual_name || !userInfo.sub || !userInfo.uid) {
      logger.error(
        { userInfo: getPropertyTypes(userInfo) },
        'Error in callback from PC, userInfo are missing elements',
      );
      const errorPageUrl = createRedirectUrl({ error: AUTH_ERROR_CODES.CLAIMS_NOT_VALID });
      return c.redirect(errorPageUrl, 302);
    }

    let user: User;
    try {
      user = await getOrCreateUser({
        sub: userInfo.sub,
        uid: String(userInfo.uid),
        email: userInfo.email,
        firstName: userInfo.given_name,
        lastName: String(userInfo.usual_name),
        pcData: userInfo,
        organizationUnit: userInfo.organizational_unit ? String(userInfo.organizational_unit) : null,
      });
      logger.info({ userId: user.id, email: user.email }, 'User authenticated successfully');
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        logger.error({ err: error }, 'Error in creating new user in database, email already exists');
        const errorPageUrl = createRedirectUrl({ error: AUTH_ERROR_CODES.USER_ALREADY_EXISTS });
        return c.redirect(errorPageUrl, 302);
      }
      logger.error({ err: error }, 'Error in creating new user in database');
      const errorPageUrl = createRedirectUrl({ error: AUTH_ERROR_CODES.USER_CREATE_ERROR });
      return c.redirect(errorPageUrl, 302);
    }
    await authUser(c, { id: user.id, roleId: user.roleId }, tokens.id_token);
    logger.info({ userId: user.id }, 'User session created successfully');

    return c.redirect(envVars.FRONTEND_REDIRECT_URI, 302);
  })

  .use(logoutMiddleware)

  .post('/logout', postLogoutRoute, async (c) => {
    const logger = c.get('logger');

    const token = getCookie(c, envVars.REFRESH_TOKEN_NAME);

    deleteCookie(c, envVars.AUTH_TOKEN_NAME);
    deleteCookie(c, envVars.REFRESH_TOKEN_NAME);
    deleteCookie(c, envVars.IS_LOGGED_TOKEN_NAME);
    logger.info('Authentication cookies cleared');

    if (token) {
      try {
        await deleteSession(token);
        logger.info('User session deleted successfully');
      } catch (error) {
        if (isPrismaUniqueConstraintError(error)) {
          logger.info({ err: error }, 'Error in deleting session, session not found');
        } else {
          logger.error({ err: error }, 'Error in deleting session');
        }
      }
    } else {
      logger.info('No session token found during logout');
    }

    return c.redirect(envVars.FRONTEND_REDIRECT_LOGIN_URI, 302);
  })

  .post('/logout-proconnect', postLogoutProconnectRoute, async (c) => {
    const logger = c.get('logger');

    const token = getCookie(c, envVars.REFRESH_TOKEN_NAME);

    deleteCookie(c, envVars.AUTH_TOKEN_NAME);
    deleteCookie(c, envVars.REFRESH_TOKEN_NAME);
    deleteCookie(c, envVars.IS_LOGGED_TOKEN_NAME);
    logger.info('Authentication cookies cleared for ProConnect logout');

    if (!token) {
      logger.warn('No session token found during ProConnect logout');
      return c.redirect(envVars.FRONTEND_REDIRECT_LOGIN_URI, 302);
    }

    const session = await getSession(token);

    if (!session) {
      logger.warn('No session found during ProConnect logout');
      return c.redirect(envVars.FRONTEND_REDIRECT_LOGIN_URI, 302);
    }

    let endSessionUrl: URL;

    try {
      endSessionUrl = await buildEndSessionUrl(session.pcIdToken);
      logger.info('ProConnect end session URL generated successfully');
    } catch (error) {
      logger.error({ err: error }, 'Error in buildEndSessionUrl');
      const errorPageUrl = createRedirectUrl({ error: AUTH_ERROR_CODES.PC_ERROR });
      return c.redirect(errorPageUrl, 302);
    }

    if (session) {
      await deleteSession(token);
      logger.info('Session deleted during ProConnect logout');
    }

    return c.redirect(endSessionUrl, 302);
  });

export default app;
