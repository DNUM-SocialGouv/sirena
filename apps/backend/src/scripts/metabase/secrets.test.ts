import { describe, expect, it } from 'vitest';
import { redactSecrets, registerSecret } from './secrets.js';

describe('redactSecrets', () => {
  it('scrubs every occurrence of a registered secret', () => {
    registerSecret('fixture-credential-alpha');
    expect(redactSecrets('sent fixture-credential-alpha twice: fixture-credential-alpha')).toBe(
      'sent «redacted» twice: «redacted»',
    );
  });

  it('leaves unrelated text untouched', () => {
    expect(redactSecrets('GET /api/card/12 → 404')).toBe('GET /api/card/12 → 404');
  });

  it('ignores values too short to be scrubbed without matching unrelated text', () => {
    registerSecret('abc');
    expect(redactSecrets('abcdef')).toBe('abcdef');
  });
});
