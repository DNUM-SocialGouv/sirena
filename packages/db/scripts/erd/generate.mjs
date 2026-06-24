import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import {
  hashComment,
  readEmbeddedHash,
  schemaHash,
  SCHEMA_PATH,
  SVG_PATH,
} from './erd-paths.mjs';

const prismaCli = createRequire(import.meta.url).resolve('prisma/build/index.js');
const { status } = spawnSync(
  process.execPath,
  [prismaCli, 'generate', '--generator', 'erd'],
  { stdio: 'inherit', env: { ...process.env, DISABLE_ERD: '' } },
);

if (status !== 0) {
  console.error(
    [
      '\n✖ ER diagram generation failed.',
      '  Rendering uses the Chromium that Puppeteer downloads at install time.',
      '  If it is missing, reinstall dependencies (pnpm install) or run',
      '  `pnpm -F @sirena/db exec puppeteer browsers install chrome-headless-shell`.\n',
    ].join('\n'),
  );
  process.exit(1);
}

const hash = schemaHash(readFileSync(SCHEMA_PATH, 'utf8'));
const svg = readFileSync(SVG_PATH, 'utf8');
const stamped = readEmbeddedHash(svg)
  ? svg.replace(/<!-- prisma-schema-sha256:[^>]*-->/, hashComment(hash))
  : svg.replace(/<svg/, `${hashComment(hash)}\n<svg`);
writeFileSync(SVG_PATH, stamped);

console.log(`✔ docs/prisma.svg generated (schema sha256 ${hash.slice(0, 12)}…)`);
