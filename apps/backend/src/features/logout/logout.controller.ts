import { AppEnvSchema } from '@/config/env.schema.ts';
import { HTTPException503NotAvailable } from '@/helpers/errors.js';
import factoryWithLogs from '@/helpers/factories/appWithLogs.ts';
import { env } from 'hono/adapter';
import { deleteCookie } from 'hono/cookie';
import { getLogoutRoute } from './logout.route.ts';

const app = factoryWithLogs
  .createApp()

  .get('/', getLogoutRoute, async (c) => {
    // Récupérer les autres variables d'environnement avec Zod
    const envVars = env(c);
    const appEnv = AppEnvSchema.parse({
      FRONTEND_REDIRECT_URI: envVars.FRONTEND_REDIRECT_URI,
    });

    deleteCookie(c, 'id_token');
    deleteCookie(c, 'access_token');
    deleteCookie(c, 'is_logged');

    return c.redirect(`${appEnv.FRONTEND_REDIRECT_URI}`, 302);
  });

export default app;
