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
      const {
        PROCONNECT_DOMAIN,
        PROCONNECT_CLIENT_ID,
        PROCONNECT_CLIENT_SECRET,
        PROCONNECT_REDIRECT_URI,
        FRONTEND_REDIRECT_URI,
      } = env<{
        PROCONNECT_DOMAIN: string;
        PROCONNECT_CLIENT_ID: string;
        PROCONNECT_CLIENT_SECRET: string;
        PROCONNECT_REDIRECT_URI: string;
        FRONTEND_REDIRECT_URI: string;
      }>(c);
      try {
        const login = await getLogin(
          c.req.query('code'),
          c.req.query('state'),
          c.req.query('iss'),
          PROCONNECT_DOMAIN,
          PROCONNECT_CLIENT_ID,
          PROCONNECT_CLIENT_SECRET,
          PROCONNECT_REDIRECT_URI,
        );
        const { tokens, state } = login;
        const userInfo = await getLoginInfo(tokens.access_token, PROCONNECT_DOMAIN);
        // Do something with usr info (register into database ?)
        console.log(userInfo);
        return c.redirect(
          `${FRONTEND_REDIRECT_URI}?access_token=${tokens.access_token}&id_token=${tokens.id_token}&state=${state}`,
        );
      } catch (e) {
        console.error(e);
        throw HTTPException503NotAvailable();
      }
    },
  );

export default app;
