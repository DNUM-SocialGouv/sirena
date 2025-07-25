import { describe, expect, it } from 'vitest';
import { AppEnvSchema } from './env.schema';

describe('env.schema.ts - LOG_EXTRA_CONTEXT', () => {
  // Base configuration with all required fields
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
  };

  /**
   * Helper function to create test config with LOG_EXTRA_CONTEXT
   */
  const createConfig = (logExtraContext?: string) => ({
    ...baseConfig,
    ...(logExtraContext !== undefined && {
      LOG_EXTRA_CONTEXT: logExtraContext,
    }),
  });

  /**
   * Helper function to parse config and return LOG_EXTRA_CONTEXT
   */
  const parseLogExtraContext = (logExtraContext?: string) => {
    const config = createConfig(logExtraContext);
    const result = AppEnvSchema.parse(config);
    return result.LOG_EXTRA_CONTEXT;
  };

  describe('LOG_EXTRA_CONTEXT parsing', () => {
    describe('basic parsing', () => {
      it('should parse empty string to empty object', () => {
        const result = parseLogExtraContext('');
        expect(result).toEqual({});
      });

      it('should parse undefined to empty object', () => {
        const result = parseLogExtraContext();
        expect(result).toEqual({});
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

    describe('whitespace handling', () => {
      it('should handle whitespace in key=value pairs', () => {
        const result = parseLogExtraContext('  env  = production  ,  service = api  ,  version=1.2.3  ');
        expect(result).toEqual({
          env: 'production',
          service: 'api',
          version: '1.2.3',
        });
      });

      it('should handle empty pairs', () => {
        const result = parseLogExtraContext('env=production,,service=api,,version=1.2.3');
        expect(result).toEqual({
          env: 'production',
          service: 'api',
          version: '1.2.3',
        });
      });
    });

    describe('malformed input handling', () => {
      it('should ignore malformed pairs gracefully', () => {
        const result = parseLogExtraContext('env=production,invalid-format,service=api,key=,=value');
        expect(result).toEqual({
          env: 'production',
          service: 'api',
        });
      });
    });
  });
});
