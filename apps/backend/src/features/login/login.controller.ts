import { AppEnvSchema } from '@/config/env.schema.ts';
import { getProConnectEnv } from '@/config/env.ts';
import { HTTPException503NotAvailable } from '@/helpers/errors.js';
import factoryWithLogs from '@/helpers/factories/appWithLogs.ts';
import { env } from 'hono/adapter';
import { validator } from 'hono/validator';
import { getLoginRoute } from './login.route.ts';
import { getLogin, getLoginInfo } from './login.service.ts';

const app = factoryWithLogs
  .createApp()

  .get(
    '/',
    validator('form', (value, c) => {
      const requiredQuery1 = c.req.query('code');
      const requiredQuery2 = c.req.query('state');
      const requiredQuery3 = c.req.query('iss');

      if (!requiredQuery1 || !requiredQuery2 || !requiredQuery3) {
        return c.text('Invalid!', 400);
      }
    }),
    getLoginRoute,
    async (c) => {
      try {
        // Récupérer les variables d'environnement ProConnect avec Zod
        const proConnectEnv = getProConnectEnv(c);

        // Récupérer les autres variables d'environnement avec Zod
        const envVars = env(c);
        const appEnv = AppEnvSchema.parse({
          FRONTEND_REDIRECT_URI: envVars.FRONTEND_REDIRECT_URI,
        });

        const login = await getLogin(
          c.req.query('code'),
          c.req.query('state'),
          c.req.query('iss'),
          proConnectEnv.PROCONNECT_DOMAIN,
          proConnectEnv.PROCONNECT_CLIENT_ID,
          proConnectEnv.PROCONNECT_CLIENT_SECRET,
          proConnectEnv.PROCONNECT_REDIRECT_URI,
        );
        const { tokens, state } = login;
        const userInfo = await getLoginInfo(tokens.access_token, proConnectEnv.PROCONNECT_DOMAIN);
        // Do something with usr info (register into database ?)
        console.log(userInfo);
        return c.redirect(
          `${appEnv.FRONTEND_REDIRECT_URI}?access_token=${tokens.access_token}&id_token=${tokens.id_token}&state=${state}`,
        );
      } catch (e) {
        console.error(e);
        throw HTTPException503NotAvailable();
      }
    },
  );

export default app;
