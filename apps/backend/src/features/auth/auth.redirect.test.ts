import { describe, expect, it, vi } from 'vitest';
import { getPostLoginRedirectUrl, getSafeRedirectPath } from './auth.redirect.js';

vi.mock('../../config/env.js', () => ({
  envVars: {
    FRONTEND_URI: 'https://sirena.example.gouv.fr',
    FRONTEND_REDIRECT_URI: 'https://sirena.example.gouv.fr/home',
  },
}));

describe('getSafeRedirectPath', () => {
  it.each(['/telechargement/0b7d3c1e-6f0a-4c2b-9d1e-3a4b5c6d7e8f', '/request/RS-2026-1?tab=processing', '/home'])(
    'keeps the application path %s',
    (path) => {
      expect(getSafeRedirectPath(path)).toBe(path);
    },
  );

  it.each([
    ['another site', 'https://evil.example.com'],
    ['a protocol-relative URL', '//evil.example.com/path'],
    ['a backslash trick', '/\\evil.example.com'],
    ['a relative path', 'telechargement/1'],
    ['a header injection', '/home\r\nSet-Cookie: x=y'],
    ['the login page', '/login?redirect=/home'],
    ['a too long path', `/${'a'.repeat(2048)}`],
    ['no value', undefined],
    ['a non-string value', ['/home']],
  ])('drops %s', (_, value) => {
    expect(getSafeRedirectPath(value)).toBeNull();
  });
});

describe('getPostLoginRedirectUrl', () => {
  it('stays on the frontend origin', () => {
    expect(getPostLoginRedirectUrl('/telechargement/1')).toBe('https://sirena.example.gouv.fr/telechargement/1');
  });

  it('falls back to the home page', () => {
    expect(getPostLoginRedirectUrl(null)).toBe('https://sirena.example.gouv.fr/home');
  });
});
