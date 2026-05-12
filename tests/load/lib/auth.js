import { signAuthToken } from './jwt.js';
import { config } from './config.js';

export function buildAuthCookieHeader() {
  const token = signAuthToken({
    userId: config.auth.userId,
    roleId: config.auth.roleId,
    secret: config.auth.secret,
    expiresInSeconds: config.auth.expirationSeconds,
  });
  return `${config.auth.cookieName}=${token}`;
}

export function authHeaders() {
  return {
    Cookie: buildAuthCookieHeader(),
    Accept: 'application/json',
  };
}
