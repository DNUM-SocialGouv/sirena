// Kept apart from redis.ts, which connects on import, so that tests can use the real masking.
export const sanitizeRedisError = (err: unknown): unknown => {
  if (!err || typeof err !== 'object' || !('command' in err)) return err;
  const e = err as Error & { command?: { name?: string; args?: unknown[] } };
  if (!Array.isArray(e.command?.args)) return err;
  return {
    name: e.name,
    message: e.message,
    stack: e.stack,
    command: { ...e.command, args: e.command.args.map(() => '****') },
  };
};
