import { getProConnectEnv } from '@/config/env.js';
import { AppEnvSchema } from '@/config/env.schema.ts';
import { fullLogoutUrl } from '@/features/logout/logout.service.js';
import factoryWithLogs from '@/helpers/factories/appWithLogs.ts';
import { env } from 'hono/adapter';
import { deleteCookie, getCookie } from 'hono/cookie';
import { getLogoutRoute } from './logout.route.ts';

const app = factoryWithLogs
  .createApp()

  .get('/', getLogoutRoute, async (c) => {
    const proConnectEnv = getProConnectEnv(c);
    const envVars = env(c);
    const appEnv = AppEnvSchema.parse({
      FRONTEND_REDIRECT_URI: envVars.FRONTEND_REDIRECT_URI,
    });
    const id_token = getCookie(c, 'id_token') || '';
    const url = await fullLogoutUrl(proConnectEnv.PROCONNECT_DOMAIN, id_token, appEnv.FRONTEND_REDIRECT_URI);
    deleteCookie(c, 'id_token');
    deleteCookie(c, 'access_token');
    deleteCookie(c, 'is_logged');
    return c.redirect(url, 302);
  });

export default app;
