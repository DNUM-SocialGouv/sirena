import http from 'k6/http';
import { config } from '../lib/config.js';
import { authHeaders, buildAuthCookieHeader } from '../lib/auth.js';

const BODY_TRUNC = 800;

const truncate = (s) => {
  if (!s) return s;
  return s.length > BODY_TRUNC ? `${s.slice(0, BODY_TRUNC)}…[+${s.length - BODY_TRUNC} more]` : s;
};

const decodeJwtPayload = (token) => {
  try {
    const segments = token.split('.');
    if (segments.length !== 3) return '(not a JWT)';
    const [, payload] = segments;
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    return atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  } catch (_) {
    return '(decode failed)';
  }
};

const logResponse = (label, res) => {
  const ct = res.headers['Content-Type'] || res.headers['content-type'] || '';
  console.log('---');
  console.log(`[${label}] ${res.request.method} ${res.url}`);
  console.log(`[${label}] status=${res.status} duration=${res.timings.duration.toFixed(1)}ms content-type=${ct}`);
  const setCookie = res.headers['Set-Cookie'] || res.headers['set-cookie'];
  if (setCookie) console.log(`[${label}] set-cookie=${setCookie}`);
  if (res.status < 200 || res.status >= 300) {
    console.log(`[${label}] body=${truncate(res.body)}`);
  } else {
    console.log(`[${label}] body[head]=${truncate((res.body || '').slice(0, 200))}`);
  }
};

export function debugJourney() {
  const cookie = buildAuthCookieHeader();
  const [name, token] = cookie.split('=');

  console.log('=== k6 debug run ===');
  console.log(`baseUrl=${config.baseUrl}`);
  console.log(`auth.cookieName=${config.auth.cookieName}`);
  console.log(`auth.userId=${config.auth.userId || '(empty)'}`);
  console.log(`auth.roleId=${config.auth.roleId}`);
  console.log(`auth.secret=${config.auth.secret ? `${config.auth.secret.length} chars` : '(EMPTY — backend will reject)'}`);
  console.log(`auth.expirationSeconds=${config.auth.expirationSeconds}`);
  console.log(`Cookie header: ${name}=<jwt:${token.length} chars>`);
  console.log(`JWT payload: ${decodeJwtPayload(token)}`);
  console.log('=== requests ===');

  const params = { headers: authHeaders() };

  const profile = http.get(`${config.baseUrl}/profile`, { ...params, tags: { endpoint: 'profile' } });
  logResponse('profile', profile);

  const entites = http.get(`${config.baseUrl}/entites/chain`, { ...params, tags: { endpoint: 'entites_chain' } });
  logResponse('entites_chain', entites);

  const list = http.get(`${config.baseUrl}/requetes-entite?limit=5&offset=0`, {
    ...params,
    tags: { endpoint: 'requetes_list' },
  });
  logResponse('requetes_list', list);

  const health = http.get(`${config.baseUrl}/health`, { tags: { endpoint: 'health' } });
  logResponse('health', health);
}
