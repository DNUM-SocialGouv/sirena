import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '../../generated/client/index.js';

type CsvRow = {
  categCode: string;
  categLib: string | null;
  entiteTypeIds: string[];
};

type DbRow = {
  id: string;
  categCode: string;
  categLib: string | null;
  entiteTypeIds: string[];
  sourceFileVersion: string | null;
};

const args = process.argv.slice(2);
const isDumpMigration = args.includes('--dump-migration');
const isInvert = args.includes('--invert');

const csvArgIndex = args.indexOf('--csv');
if (csvArgIndex === -1 || !args[csvArgIndex + 1]) {
  console.error('Usage: node scripts/diff-autorite-competente.ts --csv <path_to_csv> [--dump-migration] [--invert]');
  process.exit(1);
}
const csvPath = args[csvArgIndex + 1];

// -------------------------
// Helpers: hashing / sql
// -------------------------
function sha256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function escapeSql(val: unknown): string {
  if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
  if (val === null || val === undefined) return 'NULL';
  return String(val);
}

function escapePgTextArray(values: string[]): string {
  const escaped = values.map((v) => escapeSql(v)).join(', ');
  return `ARRAY[${escaped}]::text[]`;
}

function normalizeArray(a: string[]): string[] {
  return [...a]
    .map((x) => x.trim())
    .filter(Boolean)
    .sort();
}

function arraysEqual(a: string[], b: string[]): boolean {
  const aa = normalizeArray(a);
  const bb = normalizeArray(b);
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i++) if (aa[i] !== bb[i]) return false;
  return true;
}

function stripBom(s: string) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

// -------------------------
// CSV parser (;) with quotes
// -------------------------
function parseCsv(content: string, delimiter = ';'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const c = content[i];

    if (c === '"') {
      if (inQuotes && content[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && c === delimiter) {
      row.push(cell);
      cell = '';
      continue;
    }

    if (!inQuotes && (c === '\n' || c === '\r')) {
      if (c === '\r' && content[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += c;
  }

  row.push(cell);
  rows.push(row);

  if (rows.length && rows[rows.length - 1].every((x) => x.trim() === '')) rows.pop();
  return rows;
}

// -------------------------
// Header helpers
// -------------------------
function normHeader(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // remove accents
    .replace(/\s+/g, ' ');
}

function findHeaderIndex(headers: string[], expected: string): number {
  const target = normHeader(expected);
  return headers.findIndex((h) => normHeader(h) === target);
}

// -------------------------
// Mapping Autorité -> entiteTypeIds
// -------------------------
function parseAutoriteCell(raw: string): { ids: string[]; unknownTokens: string[] } {
  const normalized = raw.trim();
  if (!normalized) return { ids: [], unknownTokens: [] };

  // split on common separators (/, |, comma, ;)
  const tokens = normalized
    .split(/[/|,;]+/g)
    .map((t) => t.trim())
    .filter(Boolean);

  const ids: string[] = [];
  const unknownTokens: string[] = [];

  for (const t of tokens) {
    const upper = t.toUpperCase();

    if (upper === 'ARS') ids.push('ARS');
    else if (upper === 'CD') ids.push('CD');
    else if (upper === 'DREETS')
      ids.push('DD'); // map to DD
    else if (upper === 'DDETS')
      ids.push('DD'); // map to DD
    else unknownTokens.push(t);
  }

  return { ids: normalizeArray(ids), unknownTokens };
}

function uniqSorted(a: string[]): string[] {
  return [...new Set(a)].sort();
}

// -------------------------
// CSV -> expected rows
// -------------------------
function mapCsvToRows(csvFileContent: string): { rows: CsvRow[]; fileHash: string; warnings: string[] } {
  const fileHash = sha256(csvFileContent);
  const raw = stripBom(csvFileContent);

  const table = parseCsv(raw, ';');
  if (table.length < 2) throw new Error('CSV vide ou sans data');

  const headers = table[0].map((h) => h.trim());
  const data = table.slice(1);

  const idxCategCode = findHeaderIndex(headers, 'categ_code');
  const idxCategLib = findHeaderIndex(headers, 'Libellé catégorie');
  const idxAuth1 = findHeaderIndex(headers, 'Autorité compétente 1');
  const idxAuth2 = findHeaderIndex(headers, 'Autorité compétente 2');

  if (idxCategCode === -1) throw new Error(`Colonne "categ_code" introuvable. Headers: ${headers.join(' | ')}`);
  if (idxCategLib === -1) throw new Error(`Colonne "Libellé catégorie" introuvable. Headers: ${headers.join(' | ')}`);
  if (idxAuth1 === -1) throw new Error(`Colonne "Autorité compétente 1" introuvable. Headers: ${headers.join(' | ')}`);
  if (idxAuth2 === -1) throw new Error(`Colonne "Autorité compétente 2" introuvable. Headers: ${headers.join(' | ')}`);

  const rows: CsvRow[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const line = data[i];

    const categCode = (line[idxCategCode] ?? '').trim();
    if (!categCode) continue;

    const categLib = (line[idxCategLib] ?? '').trim() || null;

    const a1 = (line[idxAuth1] ?? '').trim();
    const a2 = (line[idxAuth2] ?? '').trim();

    const p1 = parseAutoriteCell(a1);
    const p2 = parseAutoriteCell(a2);

    const entiteTypeIds = uniqSorted([...p1.ids, ...p2.ids]);

    if (p1.unknownTokens.length || p2.unknownTokens.length) {
      warnings.push(
        `Row ${i + 2} categ_code=${categCode}: token(s) inconnus: ${[...p1.unknownTokens, ...p2.unknownTokens].join(', ')}`,
      );
    }

    rows.push({
      categCode,
      categLib,
      entiteTypeIds,
    });
  }

  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.categCode)) throw new Error(`CSV contient un doublon categ_code=${r.categCode}`);
    seen.add(r.categCode);
  }

  return { rows, fileHash, warnings };
}

// -------------------------
// Main: diff + dump SQL
// -------------------------
async function main() {
  const prisma = new PrismaClient();

  const csvAbs = path.isAbsolute(csvPath) ? csvPath : path.join(process.cwd(), csvPath);
  const csvContent = fs.readFileSync(csvAbs, 'utf-8');

  const { rows: expectedRows, fileHash, warnings } = mapCsvToRows(csvContent);

  const existing = (await prisma.autoriteCompetenteReferentiel.findMany({
    select: {
      id: true,
      categCode: true,
      categLib: true,
      entiteTypeIds: true,
      sourceFileVersion: true,
    },
  })) as DbRow[];

  const existingByCode = new Map(existing.map((r) => [r.categCode, r]));
  const expectedByCode = new Map(expectedRows.map((r) => [r.categCode, r]));

  const missing: CsvRow[] = [];
  const extra: DbRow[] = [];
  const updated: Array<{ old: DbRow; next: CsvRow }> = [];

  for (const exp of expectedRows) {
    const old = existingByCode.get(exp.categCode);
    if (!old) {
      missing.push(exp);
      continue;
    }

    const libChanged = (old.categLib ?? '') !== (exp.categLib ?? '');
    const idsChanged = !arraysEqual(old.entiteTypeIds ?? [], exp.entiteTypeIds ?? []);
    const hashChanged = (old.sourceFileVersion ?? '') !== fileHash;

    if (libChanged || idsChanged || hashChanged) {
      updated.push({ old, next: exp });
    }
  }

  for (const old of existing) {
    if (!expectedByCode.has(old.categCode)) extra.push(old);
  }

  if (!isDumpMigration) {
    console.log(`CSV: ${csvAbs}`);
    console.log(`CSV sha256: ${fileHash}`);
    console.log(`DB rows: ${existing.length}, CSV rows: ${expectedRows.length}`);
    console.log(`Missing: ${missing.length}, Extra: ${extra.length}, Updated: ${updated.length}`);
    if (warnings.length) {
      console.log(`\n⚠️  Warnings (${warnings.length}) (unknown authority tokens):`);
      warnings.slice(0, 50).forEach((w) => {
        console.log(`- ${w}`);
      });
      if (warnings.length > 50) console.log(`... (${warnings.length - 50} more)`);
    }
    await prisma.$disconnect();
    return;
  }

  // SQL dump
  if (isInvert) {
    if (missing.length) {
      console.log(`\n-- [DOWN] Revert INSERTS`);
      for (const r of missing) {
        console.log(
          `DELETE FROM "public"."AutoriteCompetenteReferentiel" WHERE "categCode" = ${escapeSql(r.categCode)};`,
        );
      }
    }

    if (extra.length) {
      console.log(`\n-- [DOWN] Revert DELETES (re-insert removed rows)`);
      console.log(
        `INSERT INTO "public"."AutoriteCompetenteReferentiel" ("id","categCode","categLib","entiteTypeIds","sourceFileVersion","createdAt","updatedAt") VALUES`,
      );
      const values = extra
        .map((r) => {
          return `(${escapeSql(r.id)}, ${escapeSql(r.categCode)}, ${escapeSql(r.categLib ?? null)}, ${escapePgTextArray(
            normalizeArray(r.entiteTypeIds ?? []),
          )}, ${escapeSql(r.sourceFileVersion ?? null)}, now(), now())`;
        })
        .join(',\n');
      console.log(`${values};`);
    }

    if (updated.length) {
      console.log(`\n-- [DOWN] Revert UPDATES`);
      for (const { old } of updated) {
        console.log(
          `UPDATE "public"."AutoriteCompetenteReferentiel" SET ` +
            `"categLib" = ${escapeSql(old.categLib ?? null)}, ` +
            `"entiteTypeIds" = ${escapePgTextArray(normalizeArray(old.entiteTypeIds ?? []))}, ` +
            `"sourceFileVersion" = ${escapeSql(old.sourceFileVersion ?? null)}, ` +
            `"updatedAt" = now() ` +
            `WHERE "categCode" = ${escapeSql(old.categCode)};`,
        );
      }
    }

    await prisma.$disconnect();
    return;
  }

  console.log(`-- CSV used: ${csvAbs}`);
  console.log(`-- CSV sha256: ${fileHash}`);
  if (warnings.length) {
    console.log(
      `-- WARNINGS (unknown authority tokens): ${warnings.length} (see local run without --dump-migration for details)`,
    );
  }

  if (missing.length) {
    console.log(`\n-- INSERT missing rows`);
    console.log(
      `INSERT INTO "public"."AutoriteCompetenteReferentiel" ("id","categCode","categLib","entiteTypeIds","sourceFileVersion","createdAt","updatedAt") VALUES`,
    );
    const values = missing
      .map((r) => {
        return `(gen_random_uuid(), ${escapeSql(r.categCode)}, ${escapeSql(r.categLib ?? null)}, ${escapePgTextArray(
          normalizeArray(r.entiteTypeIds),
        )}, ${escapeSql(fileHash)}, now(), now())`;
      })
      .join(',\n');
    console.log(`${values};`);
  }

  if (extra.length) {
    console.log(`\n-- DELETE extra rows (present in DB but not in CSV)`);
    for (const r of extra) {
      console.log(
        `DELETE FROM "public"."AutoriteCompetenteReferentiel" WHERE "categCode" = ${escapeSql(r.categCode)};`,
      );
    }
  }

  if (updated.length) {
    console.log(`\n-- UPDATE changed rows`);
    for (const { old, next } of updated) {
      console.log(
        `UPDATE "public"."AutoriteCompetenteReferentiel" SET ` +
          `"categLib" = ${escapeSql(next.categLib ?? null)}, ` +
          `"entiteTypeIds" = ${escapePgTextArray(normalizeArray(next.entiteTypeIds))}, ` +
          `"sourceFileVersion" = ${escapeSql(fileHash)}, ` +
          `"updatedAt" = now() ` +
          `WHERE "categCode" = ${escapeSql(old.categCode)};`,
      );
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
