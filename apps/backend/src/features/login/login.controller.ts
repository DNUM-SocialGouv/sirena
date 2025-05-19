import { AppEnvSchema } from '@/config/env.schema.ts';
import { getProConnectEnv } from '@/config/env.ts';
import { HTTPException503NotAvailable } from '@/helpers/errors.js';
import factoryWithLogs from '@/helpers/factories/appWithLogs.ts';
import { validator as zValidator } from 'hono-openapi/zod';
import { env } from 'hono/adapter';
import { z } from 'zod';
import { getLoginRoute } from './login.route.ts';
import { getLogin, getLoginInfo } from './login.service.ts';
import 'zod-openapi/extend';
import { setCookie } from 'hono/cookie';

const app = factoryWithLogs
  .createApp()

  .get(
    '/',
    zValidator(
      'query',
      z.object({
        code: z.string(),
        state: z.string(),
        iss: z.string(),
      }),
    ),
    getLoginRoute,
    async (c) => {
      const proConnectEnv = getProConnectEnv(c);
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
      const authTokenDate = new Date(new Date().getTime() + Number.parseInt('86400', 10) * 1000);

      setCookie(c, 'id_token', `Bearer ${tokens.id_token}`, {
        path: '/',
        secure: true,
        httpOnly: true,
        expires: authTokenDate,
        sameSite: 'Strict',
      });

      setCookie(c, 'access_token', `Bearer ${tokens.access_token}`, {
        path: '/',
        secure: true,
        httpOnly: true,
        expires: authTokenDate,
        sameSite: 'Strict',
      });

      setCookie(c, 'is_logged', 'true', {
        path: '/',
        secure: true,
        expires: authTokenDate,
        sameSite: 'Strict',
      });

      return c.redirect(`${appEnv.FRONTEND_REDIRECT_URI}?state=${state}`, 302);
    },
  );

export default app;
