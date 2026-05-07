const requireEnv = (name) => {
  const value = __ENV[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

const host = (__ENV.LOAD_TEST_BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');

export const config = {
  baseUrl: `${host}/api`,
  scenario: __ENV.SCENARIO || 'smoke',
  auth: {
    secret: __ENV.AUTH_TOKEN_SECRET_KEY || '',
    cookieName: __ENV.AUTH_TOKEN_NAME || 'authToken',
    expirationSeconds: Number.parseInt(__ENV.AUTH_TOKEN_EXPIRATION || '600', 10),
    userId: __ENV.LOAD_TEST_USER_ID || '',
    roleId: __ENV.LOAD_TEST_ROLE_ID || 'PENDING',
  },
};

export function assertAuthEnv() {
  requireEnv('AUTH_TOKEN_SECRET_KEY');
  requireEnv('LOAD_TEST_USER_ID');
}
