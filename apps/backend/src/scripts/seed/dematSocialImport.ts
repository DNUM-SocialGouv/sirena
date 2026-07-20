import { spawnSync } from 'node:child_process';

/**
 * Runs the real DematSocial import by spawning the existing `op:import:dematsocial`
 * script, so its full wrapper (logger, Sentry, Redis, abort controller) is reused
 * as-is. Requires the DematSocial API tokens and Redis to be available.
 */
export const runRealDematSocialImport = (): void => {
  console.log('\n▶ Import DematSocial réel (API externe)…');
  const result = spawnSync('pnpm', ['--filter', '@sirena/backend', 'op:import:dematsocial'], {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    // Throw so the seed reports a real failure (exit code ≠ 0) instead of
    // printing a success summary on a broken import.
    throw new Error(`Import DematSocial échoué (code ${result.status ?? 'inconnu'}). Tokens API / Redis disponibles ?`);
  }
};
