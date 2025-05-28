import { envVars } from '@/config/env';
import { deleteSession, getSession } from '@/features/sessions/sessions.service';
import factoryWithAuth from '@/helpers/factories/appWithAuth';
import authMiddleware from '@/middlewares/auth.middleware';
import { deleteCookie, getCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';

const app = factoryWithAuth.createMiddleware(async (c, next) => {
  try {
    return await authMiddleware(c, next);
  } catch (error) {
    if (error instanceof HTTPException) {
      return c.redirect(envVars.FRONTEND_REDIRECT_LOGIN_URI, 302);
    }
    const logger = c.get('logger');
    logger.error({ err: error }, 'error during logout');

    // delete session in case not deleted
    const token = getCookie(c, envVars.REFRESH_TOKEN_NAME);

    deleteCookie(c, envVars.AUTH_TOKEN_NAME);
    deleteCookie(c, envVars.REFRESH_TOKEN_NAME);
    deleteCookie(c, envVars.IS_LOGGED_TOKEN_NAME);

    if (token) {
      const session = await getSession(token);

      if (session) {
        await deleteSession(token);
      }
    }

    return c.redirect(envVars.FRONTEND_REDIRECT_LOGIN_URI, 302);
  }
});

export default app;
