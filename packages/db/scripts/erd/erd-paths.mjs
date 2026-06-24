import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const fromHere = (relative) => fileURLToPath(new URL(relative, import.meta.url));

export const SCHEMA_PATH = fromHere('../../prisma/schema.prisma');
export const SVG_PATH = fromHere('../../../../docs/prisma.svg');

const MARKER = 'prisma-schema-sha256';
export const schemaHash = (schema) =>
  createHash('sha256').update(schema.replace(/\r\n/g, '\n')).digest('hex');

export const hashComment = (hash) => `<!-- ${MARKER}: ${hash} -->`;

export const readEmbeddedHash = (svg) => {
  const match = svg.match(new RegExp(`${MARKER}:\\s*([a-f0-9]{64})`));
  return match ? match[1] : null;
};
