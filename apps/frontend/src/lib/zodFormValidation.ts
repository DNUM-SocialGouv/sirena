import type { ZodError } from 'zod';

export function zodIssuesToFieldErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};

  error.issues.forEach((issue) => {
    const field = issue.path[0];

    if (typeof field === 'string' && !errors[field]) {
      errors[field] = issue.message;
    }
  });

  return errors;
}
