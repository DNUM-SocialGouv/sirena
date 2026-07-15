import { spawnSync } from 'node:child_process';

type Step = {
  label: string;
  command: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
};

/**
 * Chain requested by the CLI when starting from scratch:
 * reset (drop + replay migrations) → generate (Prisma client) → build backend.
 * `--force` makes the reset non-interactive; the safeguard is the upstream CLI
 * confirmation. Children inherit process.env (PG_URL loaded via the `op:seed`
 * dotenv wrapper).
 */
const STEPS: Step[] = [
  {
    label: 'Réinitialisation de la base (prisma migrate reset)',
    command: 'pnpm',
    args: ['--filter', '@sirena/db', 'exec', 'prisma', 'migrate', 'reset', '--force'],
    env: { DISABLE_ERD: 'true' },
  },
  {
    label: 'Génération du client Prisma',
    command: 'pnpm',
    args: ['--filter', '@sirena/db', 'generate'],
  },
  {
    label: 'Build du backend',
    command: 'pnpm',
    args: ['--filter', '@sirena/backend', 'build'],
  },
];

export const runReset = (): void => {
  for (const step of STEPS) {
    console.log(`\n▶ ${step.label}…`);
    const result = spawnSync(step.command, step.args, {
      stdio: 'inherit',
      env: { ...process.env, ...step.env },
    });

    if (result.status !== 0) {
      throw new Error(`Échec de l'étape "${step.label}" (code ${result.status ?? 'inconnu'}).`);
    }
  }
  console.log('\n✅ Base réinitialisée.\n');
};
