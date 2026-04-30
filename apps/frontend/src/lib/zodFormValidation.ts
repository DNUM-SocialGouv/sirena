import type { ZodError } from 'zod';

type SafeParseSchema<T> = {
  safeParse(data: T): { success: true } | { success: false; error: ZodError };
};

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

export function getFieldError<T extends Record<string, unknown>>(
  schema: SafeParseSchema<T>,
  data: T,
  field: keyof T,
): string | undefined {
  const result = schema.safeParse(data);

  if (result.success) return undefined;

  const errors = zodIssuesToFieldErrors(result.error);
  return errors[field as string];
}
