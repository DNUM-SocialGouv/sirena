import { getConnInfo } from '@hono/node-server/conninfo';
import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
const extractIdToken = (tokenString: string): string => {
  const idTokenMatch = tokenString.match(/id_token=([^;]+)/);
  if (!idTokenMatch) return '';

  // Décoder l'URL et retirer le préfixe "Bearer "
  const decodedToken = decodeURIComponent(idTokenMatch[1]);
  return decodedToken.replace('Bearer ', '');
};
const parseJwt = (token: string) => {
  console.error(token);
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
};

export const fonctionalLogger = createMiddleware(async (c, next) => {
  // using c.var.logger to get the logger because the logger is not assigned at this time
  const logger = c.var.logger;
  const authToken = getCookie(c, 'auth_token');
  let id = 'unauthenticated';
  if (authToken) {
    id = parseJwt(authToken).id;
  }
  const info = getConnInfo(c);
  logger.assign({
    user_info: {
      ip: info.remote.address,
      id,
      request_id: c.get('requestId'),
      ipType: info.remote.addressType,
    },
  });
  await next();
});
