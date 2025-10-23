import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EnvSchema } from './env.schema';

const originalEnv = process.env;

describe('logging configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  describe('EnvSchema log level defaults', () => {
    it('should apply default values when log level variables are not provided', () => {
      const mockEnv = createMinimalValidEnv();

      const result = EnvSchema.parse(mockEnv);

      expect(result.LOG_LEVEL).toBe('info');
    });

    it('should use custom values when provided', () => {
      const mockEnv = {
        ...createMinimalValidEnv(),
        LOG_LEVEL: 'trace',
      };

      const result = EnvSchema.parse(mockEnv);

      expect(result.LOG_LEVEL).toBe('trace');
    });

    it('should reject invalid log level values', () => {
      expect(() =>
        EnvSchema.parse({
          ...createMinimalValidEnv(),
          LOG_LEVEL: 'invalid',
        }),
      ).toThrow(/LOG_LEVEL/);
    });
  });

  function createMinimalValidEnv() {
    return {
      PC_DOMAIN: 'test.domain.com',
      PC_CLIENT_ID: 'test-client-id',
      PC_CLIENT_SECRET: 'test-client-secret',
      PC_ID_TOKEN_SIGNED_RESPONSE_ALG: 'RS256',
      PC_USERINFO_SIGNED_RESPONSE_ALG: 'RS256',
      PC_REDIRECT_URI: 'https://test.com/callback',

      AUTH_TOKEN_NAME: 'test-auth-token',
      REFRESH_TOKEN_NAME: 'test-refresh-token',
      IS_LOGGED_TOKEN_NAME: 'test-logged-token',
      AUTH_TOKEN_EXPIRATION: '15m',
      REFRESH_TOKEN_EXPIRATION: '7d',
      AUTH_TOKEN_SECRET_KEY: 'test-auth-secret-key',
      REFRESH_TOKEN_SECRET_KEY: 'test-refresh-secret-key',

      FRONTEND_URI: 'https://test-frontend.com',
      FRONTEND_REDIRECT_URI: 'https://test-frontend.com/redirect',
      FRONTEND_REDIRECT_LOGIN_URI: 'https://test-frontend.com/login',

      DEMAT_SOCIAL_API_URL: 'https://api.test.com',
      DEMAT_SOCIAL_API_TOKEN: 'test-api-token',
      DEMAT_SOCIAL_API_DIRECTORY: '123',

      SUPER_ADMIN_LIST_EMAIL: 'admin@test.com',
      S3_BUCKET_ACCESS_KEY: 'root',
      S3_BUCKET_SECRET_KEY: 'rootroot',
      S3_BUCKET_ENDPOINT: 'localhost',
      S3_BUCKET_PORT: '9000',
      S3_BUCKET_NAME: 'files',
      S3_BUCKET_REGION: 'us-east-1',
      S3_BUCKET_ROOT_DIR: 'uploads',
      SARBACANE_API_URL: 'https://api.sarbacane.com/sendkit',
      SARBACANE_API_KEY: 'test-api-key',

      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      REDIS_PASSWORD: '',
      REDIS_USER: 'redis-user',

      CRON_DEMAT_SOCIAL: '10000',
    };
  }
});
