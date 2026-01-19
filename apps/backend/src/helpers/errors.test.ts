import { describe, expect, it, vi } from 'vitest';
import { serializeError } from './errors.js';

vi.mock('../config/env.js', () => ({
  envVars: {
    SENTRY_ENABLED: true,
  },
}));

describe('serializeError', () => {
  describe('basic error handling', () => {
    it('should serialize a simple Error object', () => {
      const error = new Error('Test error message');
      const result = serializeError(error);

      expect(result).toEqual({
        name: 'Error',
        message: 'Test error message',
        stack: expect.any(String),
        tag: undefined,
        cause: undefined,
        errors: undefined,
      });
      expect(result.stack).toContain('Error: Test error message');
    });

    it('should handle null', () => {
      const result = serializeError(null);
      expect(result).toEqual({ message: 'null' });
    });

    it('should handle undefined', () => {
      const result = serializeError(undefined);
      expect(result).toEqual({ message: 'undefined' });
    });

    it('should handle string', () => {
      const result = serializeError('simple string error');
      expect(result).toEqual({ message: 'simple string error' });
    });

    it('should handle number', () => {
      const result = serializeError(42);
      expect(result).toEqual({ message: '42' });
    });
  });

  describe('error with cause', () => {
    it('should extract cause message', () => {
      const cause = new Error('Root cause');
      const error = new Error('Outer error');
      // biome-ignore lint/suspicious/noExplicitAny: test purposes
      (error as any).cause = cause;

      const result = serializeError(error);

      expect(result).toEqual({
        name: 'Error',
        message: 'Outer error',
        stack: expect.any(String),
        tag: undefined,
        cause: 'Root cause',
        errors: undefined,
      });
    });

    it('should handle cause without message', () => {
      const error = new Error('Outer error');
      // biome-ignore lint/suspicious/noExplicitAny: test purposes
      (error as any).cause = {};

      const result = serializeError(error);

      expect(result.cause).toBeUndefined();
    });
  });

  describe('error with _tag', () => {
    it('should extract _tag field', () => {
      const error = new Error('Tagged error');
      // biome-ignore lint/suspicious/noExplicitAny: test purposes
      (error as any)._tag = 'ContextualAggregateError';

      const result = serializeError(error);

      expect(result.tag).toBe('ContextualAggregateError');
    });
  });

  describe('Graffle/GraphQL errors array', () => {
    it('should serialize errors array with GraphQL error structure', () => {
      const error = {
        name: 'ContextualAggregateError',
        message: 'Multiple errors occurred',
        _tag: 'ContextualAggregateError',
        errors: [
          {
            name: 'GraphQLError',
            message: 'Dossier not found',
            path: ['dossier'],
            extensions: {
              code: 'NOT_FOUND',
              timestamp: '2025-01-01T00:00:00Z',
            },
            _tag: 'GraphQLError',
            cause: {
              message: 'Dossier 300000 does not exist',
            },
          },
        ],
      };

      const result = serializeError(error);

      expect(result).toEqual({
        name: 'ContextualAggregateError',
        message: 'Multiple errors occurred',
        tag: 'ContextualAggregateError',
        stack: undefined,
        cause: undefined,
        errors: [
          {
            name: 'GraphQLError',
            message: 'Dossier not found',
            tag: 'GraphQLError',
            path: ['dossier'],
            extensions: {
              code: 'NOT_FOUND',
              timestamp: '2025-01-01T00:00:00Z',
            },
            cause: 'Dossier 300000 does not exist',
          },
        ],
      });
    });

    it('should handle multiple errors in array', () => {
      const error = {
        errors: [
          {
            message: 'First error',
            path: ['field1'],
            extensions: { code: 'ERROR_1' },
          },
          {
            message: 'Second error',
            path: ['field2'],
            extensions: { code: 'ERROR_2' },
          },
        ],
      };

      const result = serializeError(error);

      expect(result.errors).toHaveLength(2);
      expect(result.errors?.[0]?.message).toBe('First error');
      expect(result.errors?.[1]?.message).toBe('Second error');
    });

    it('should handle non-object items in errors array', () => {
      const error = {
        errors: ['string error', 42, null],
      };

      const result = serializeError(error);

      expect(result.errors).toHaveLength(3);
      expect(result.errors?.[0]).toEqual({ message: 'string error' });
      expect(result.errors?.[1]).toEqual({ message: '42' });
      expect(result.errors?.[2]).toEqual({ message: 'null' });
    });
  });

  describe('extensions sanitization', () => {
    it('should filter out sensitive fields from extensions', () => {
      const error = {
        errors: [
          {
            message: 'Test error',
            extensions: {
              code: 'ERROR_CODE',
              headers: { authorization: 'Bearer secret-token' },
              token: 'secret-token',
              password: 'secret-password',
              authorization: 'Bearer token',
              cookie: 'session=abc123',
              secret: 'my-secret',
              apikey: 'api-key-123',
              request: { body: { password: 'secret' } },
              response: { headers: { 'set-cookie': 'token=xyz' } },
              raw: 'sensitive data',
              safeField: 'this is safe',
            },
          },
        ],
      };

      const result = serializeError(error);

      expect(result.errors?.[0]?.extensions).toEqual({
        code: 'ERROR_CODE',
        safeField: 'this is safe',
      });
    });

    it('should handle case-insensitive field filtering', () => {
      const error = {
        errors: [
          {
            message: 'Test error',
            extensions: {
              Authorization: 'Bearer token',
              TOKEN: 'secret',
              Headers: { 'x-api-key': 'key' },
              safeField: 'safe',
            },
          },
        ],
      };

      const result = serializeError(error);

      expect(result.errors?.[0]?.extensions).toEqual({
        safeField: 'safe',
      });
    });

    it('should keep extensions if not an object', () => {
      const error = {
        errors: [
          {
            message: 'Test error',
            extensions: 'not an object',
          },
        ],
      };

      const result = serializeError(error);

      expect(result.errors?.[0]?.extensions).toBe('not an object');
    });
  });

  describe('path handling', () => {
    it('should preserve path as-is (string array)', () => {
      const error = {
        errors: [
          {
            message: 'Test error',
            path: ['dossier', 'champs', 0, 'value'],
          },
        ],
      };

      const result = serializeError(error);

      expect(result.errors?.[0]?.path).toEqual(['dossier', 'champs', 0, 'value']);
    });

    it('should preserve path as-is (string)', () => {
      const error = {
        errors: [
          {
            message: 'Test error',
            path: 'dossier.champs',
          },
        ],
      };

      const result = serializeError(error);

      expect(result.errors?.[0]?.path).toBe('dossier.champs');
    });
  });

  describe('complex Graffle error structure', () => {
    it('should handle complete Graffle error with all fields', () => {
      const error = {
        name: 'ContextualAggregateError',
        message: 'Multiple GraphQL errors',
        _tag: 'ContextualAggregateError',
        stack: 'Error stack trace...',
        cause: {
          message: 'Network error',
        },
        errors: [
          {
            name: 'GraphQLError',
            message: 'Field error',
            _tag: 'GraphQLError',
            path: ['query', 'dossier'],
            extensions: {
              code: 'FIELD_ERROR',
              line: 10,
              column: 5,
            },
            cause: {
              message: 'Invalid field value',
            },
          },
          {
            name: 'ValidationError',
            message: 'Validation failed',
            path: ['mutation', 'createDossier'],
            extensions: {
              code: 'VALIDATION_ERROR',
            },
          },
        ],
      };

      const result = serializeError(error);

      expect(result.name).toBe('ContextualAggregateError');
      expect(result.message).toBe('Multiple GraphQL errors');
      expect(result.tag).toBe('ContextualAggregateError');
      expect(result.stack).toBe('Error stack trace...');
      expect(result.cause).toBe('Network error');
      expect(result.errors).toHaveLength(2);
      expect(result.errors?.[0]?.name).toBe('GraphQLError');
      expect((result.errors?.[0]?.extensions as { code?: string })?.code).toBe('FIELD_ERROR');
      expect(result.errors?.[1]?.name).toBe('ValidationError');
    });
  });

  describe('edge cases', () => {
    it('should handle error with empty errors array', () => {
      const error = {
        message: 'Error with empty errors',
        errors: [],
      };

      const result = serializeError(error);

      expect(result.errors).toEqual([]);
    });

    it('should handle error with null cause', () => {
      const error = {
        message: 'Error',
        cause: null,
      };

      const result = serializeError(error);

      expect(result.cause).toBeUndefined();
    });

    it('should handle error with cause that is not an object', () => {
      const error = {
        message: 'Error',
        cause: 'string cause',
      };

      const result = serializeError(error);

      expect(result.cause).toBeUndefined();
    });

    it('should handle error with extensions containing nested objects', () => {
      const error = {
        errors: [
          {
            message: 'Test error',
            extensions: {
              code: 'ERROR',
              metadata: {
                userId: '123',
                timestamp: '2025-01-01',
              },
            },
          },
        ],
      };

      const result = serializeError(error);

      expect(result.errors?.[0]?.extensions).toEqual({
        code: 'ERROR',
        metadata: {
          userId: '123',
          timestamp: '2025-01-01',
        },
      });
    });
  });
});
