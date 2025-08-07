import { describe, expect, it } from 'vitest';
import { AppEnvSchema } from './env.schema';

describe('env.schema.ts - LOG_EXTRA_CONTEXT', () => {
  const baseConfig = {
    FRONTEND_URI: 'http://localhost:3000',
    FRONTEND_REDIRECT_URI: 'http://localhost:3000/auth/callback',
    FRONTEND_REDIRECT_LOGIN_URI: 'http://localhost:3000/login',
    AUTH_TOKEN_SECRET_KEY: 'secret',
    REFRESH_TOKEN_SECRET_KEY: 'secret',
    AUTH_TOKEN_EXPIRATION: '1h',
    REFRESH_TOKEN_EXPIRATION: '7d',
    AUTH_TOKEN_NAME: 'token',
    REFRESH_TOKEN_NAME: 'refresh',
    IS_LOGGED_TOKEN_NAME: 'logged',
    DEMAT_SOCIAL_API_URL: 'http://api.example.com',
    DEMAT_SOCIAL_API_TOKEN: 'token',
    DEMAT_SOCIAL_API_DIRECTORY: '123',
    S3_BUCKET_ACCESS_KEY: 'root',
    S3_BUCKET_SECRET_KEY: 'rootroot',
    S3_BUCKET_ENDPOINT: 'localhost',
    S3_BUCKET_PORT: '9000',
    S3_BUCKET_NAME: 'files',
    S3_BUCKET_REGION: 'us-east-1',
    S3_BUCKET_ROOT_DIR: 'uploads',
  };

  const createConfig = (logExtraContext?: string) => ({
    ...baseConfig,
    ...(logExtraContext !== undefined && {
      LOG_EXTRA_CONTEXT: logExtraContext,
    }),
  });

  const parseLogExtraContext = (logExtraContext?: string) => {
    const config = createConfig(logExtraContext);
    const result = AppEnvSchema.parse(config);
    return result.LOG_EXTRA_CONTEXT;
  };

  describe('LOG_EXTRA_CONTEXT parsing', () => {
    describe('basic parsing', () => {
      it('should parse empty/undefined input to empty object', () => {
        expect(parseLogExtraContext('')).toEqual({});
        expect(parseLogExtraContext()).toEqual({});
      });

      it('should parse single key=value pair', () => {
        const result = parseLogExtraContext('env=production');
        expect(result).toEqual({
          env: 'production',
        });
      });

      it('should parse multiple key=value pairs', () => {
        const result = parseLogExtraContext('env=production,service=api,version=1.2.3');
        expect(result).toEqual({
          env: 'production',
          service: 'api',
          version: '1.2.3',
        });
      });
    });
  });
});
