import { existsSync, readFileSync } from 'node:fs';
import { readEmbeddedHash, schemaHash, SCHEMA_PATH, SVG_PATH } from './erd-paths.mjs';

const fail = (message) => {
  console.error(`\n✖ ${message}`);
  console.error('  Regenerate the diagram with `pnpm db:erd`, then commit docs/prisma.svg.\n');
  process.exit(1);
};

if (!existsSync(SVG_PATH)) fail('docs/prisma.svg is missing.');

const expected = schemaHash(readFileSync(SCHEMA_PATH, 'utf8'));
const actual = readEmbeddedHash(readFileSync(SVG_PATH, 'utf8'));

if (!actual) fail('docs/prisma.svg does not contain the schema fingerprint.');
if (actual !== expected) {
  fail(`docs/prisma.svg is out of date (expected ${expected.slice(0, 12)}…, found ${actual.slice(0, 12)}…).`);
}

console.log('✔ docs/prisma.svg is up to date with the Prisma schema.');
