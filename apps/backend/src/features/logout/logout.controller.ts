import { AppEnvSchema } from '@/config/env.schema.ts';
import { getProConnectEnv } from '@/config/env.ts';
import { HTTPException503NotAvailable } from '@/helpers/errors.js';
import factoryWithLogs from '@/helpers/factories/appWithLogs.ts';
import { env } from 'hono/adapter';
import { getLogoutRoute } from './logout.route.ts';
import 'zod-openapi/extend';
import { setCookie } from 'hono/cookie';

const app = factoryWithLogs
  .createApp()

  .get('/', getLogoutRoute, async (c) => {
    try {
      // Récupérer les autres variables d'environnement avec Zod
      const envVars = env(c);
      const appEnv = AppEnvSchema.parse({
        FRONTEND_REDIRECT_URI: envVars.FRONTEND_REDIRECT_URI,
      });

      // Suppression des cookies d'authentification en définissant une date d'expiration dans le passé
      const authTokenDate = new Date(new Date().getTime() - Number.parseInt('86400', 10) * 1000);

      setCookie(c, 'id_token', '', {
        path: '/',
        secure: true,
        httpOnly: true,
        expires: authTokenDate,
        sameSite: 'Strict',
      });

      setCookie(c, 'access_token', '', {
        path: '/',
        secure: true,
        httpOnly: true,
        expires: authTokenDate,
        sameSite: 'Strict',
      });

      setCookie(c, 'is_logged', 'false', {
        path: '/',
        secure: true,
        expires: authTokenDate,
        sameSite: 'Strict',
      });

      return c.redirect(`${appEnv.FRONTEND_REDIRECT_URI}`, 302);
    } catch (e) {
      console.error(e);
      throw HTTPException503NotAvailable();
    }
  });

export default app;
