const REDACTED = '«redacted»';

export const MIN_REDACTABLE_LENGTH = 8;

const secrets = new Set<string>();

export function registerSecret(value: string): boolean {
  if (value.length < MIN_REDACTABLE_LENGTH) return false;
  secrets.add(value);
  return true;
}

export function redactSecrets(text: string): string {
  let out = text;
  for (const secret of secrets) out = out.split(secret).join(REDACTED);
  return out;
}
