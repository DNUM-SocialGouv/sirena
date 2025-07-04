import { describe, expect, it } from 'vitest';
import { AppEnvSchema } from './env.schema';

process.env = {
  PC_DOMAIN: 'https://example.com',
  PC_CLIENT_ID: 'client-id',
  PC_CLIENT_SECRET: 'client-secret',
  PC_ID_TOKEN_SIGNED_RESPONSE_ALG: 'RS256',
  PC_USERINFO_SIGNED_RESPONSE_ALG: 'RS256',
  PC_REDIRECT_URI: 'https://example.com/callback',

  AUTH_TOKEN_NAME: 'auth_token',
  REFRESH_TOKEN_NAME: 'refresh_token',
  IS_LOGGED_TOKEN_NAME: 'is_logged',
  AUTH_TOKEN_EXPIRATION: '3600',
  REFRESH_TOKEN_EXPIRATION: '86400',
  AUTH_TOKEN_SECRET_KEY: 'secret-auth',
  REFRESH_TOKEN_SECRET_KEY: 'secret-refresh',

  FRONTEND_URI: 'https://frontend.com',
  FRONTEND_REDIRECT_URI: 'https://frontend.com/callback',
  FRONTEND_REDIRECT_LOGIN_URI: 'https://frontend.com/login',

  DEMAT_SOCIAL_API_URL: 'https://demat.social/api',
  DEMAT_SOCIAL_API_TOKEN: 'token123',
  DEMAT_SOCIAL_API_DIRECTORY: '123',

  LOG_FORMAT: 'json',
};

describe('env.ts', () => {
  it('should parse and return validated environment variables', async () => {
    const { envVars } = await import('./env'); // Import after env is set
    expect(envVars.PC_DOMAIN).toBe('https://example.com');
    expect(envVars.AUTH_TOKEN_NAME).toBe('auth_token');
    expect(envVars.LOG_FORMAT).toBe('json');
  });

  it('should fail if DEMAT_SOCIAL_API_DIRECTORY is not a valid integer', () => {
    const invalidEnv = {
      FRONTEND_URI: 'https://front.com',
      FRONTEND_REDIRECT_URI: 'https://front.com/callback',
      FRONTEND_REDIRECT_LOGIN_URI: 'https://front.com/login',
      AUTH_TOKEN_SECRET_KEY: 'secret1',
      REFRESH_TOKEN_SECRET_KEY: 'secret2',
      AUTH_TOKEN_EXPIRATION: '3600',
      REFRESH_TOKEN_EXPIRATION: '86400',
      AUTH_TOKEN_NAME: 'auth',
      REFRESH_TOKEN_NAME: 'refresh',
      IS_LOGGED_TOKEN_NAME: 'is_logged',
      DEMAT_SOCIAL_API_URL: 'https://demat.api',
      DEMAT_SOCIAL_API_TOKEN: 'token',
      DEMAT_SOCIAL_API_DIRECTORY: 'not-a-number',
      LOG_FORMAT: 'json',
    };

    expect(() => AppEnvSchema.parse(invalidEnv)).toThrowError(
      "La variable d'environnement DEMAT_SOCIAL_API_DIRECTORY doit etre un integer",
    );
  });
});
