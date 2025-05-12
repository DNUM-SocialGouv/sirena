import factoryWithLogs from '@/helpers/factories/appWithLogs.ts';
import { getLoginRoute } from './login.route.ts';
import { getLogin, getLoginInfo } from './login.service.ts';
import { env } from 'hono/adapter';

const app = factoryWithLogs
  .createApp()

  .get('/', getLoginRoute, async (c) => {
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
      console.log(userInfo)
    return c.redirect(
      `${FRONTEND_REDIRECT_URI}?access_token=${tokens.access_token}&id_token=${tokens.id_token}&state=${state}`,
    );
  });

export default app;
