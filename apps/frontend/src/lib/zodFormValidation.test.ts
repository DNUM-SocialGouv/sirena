import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { zodIssuesToFieldErrors } from './zodFormValidation';

describe('zodIssuesToFieldErrors', () => {
  it('maps first zod issue for each field to a field error record', () => {
    const schema = z.object({
      name: z.string().trim().min(1, 'Name is required.'),
      email: z.email('Email is invalid.'),
    });

    const result = schema.safeParse({ name: '', email: 'not-an-email' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodIssuesToFieldErrors(result.error)).toEqual({
        name: 'Name is required.',
        email: 'Email is invalid.',
      });
    }
  });

  it('ignores form-level issues that are not associated with a string field path', () => {
    const schema = z.object({ password: z.string() }).refine(() => false, 'Form-level error.');

    const result = schema.safeParse({ password: 'secret' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodIssuesToFieldErrors(result.error)).toEqual({});
    }
  });
});
