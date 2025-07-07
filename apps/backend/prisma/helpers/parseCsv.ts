import { readFile } from 'node:fs/promises';
import type { ZodType, z } from '@/libs/zod';

export async function parseCsv<Schema extends ZodType<unknown>>(
  path: string,
  schema: Schema,
  callback: (data: z.infer<Schema>[]) => Promise<{ table: string; added: number }>,
) {
  const csvRaw = await readFile(path, 'utf8');
  const [headerLine, ...lines] = csvRaw.trim().split('\n');
  const headers = headerLine.split(';');

  const rows = lines.map((line, i) => {
    const values = line.split(';');

    if (values.length !== headers.length) {
      throw new Error(`Malformed CSV on line ${i + 2}: "${line}"`);
    }

    const raw = Object.fromEntries(headers.map((h, idx) => [h.trim(), values[idx].trim()]));
    const result = schema.safeParse(raw);

    if (!result.success) {
      throw new Error(`Invalid data on line ${i + 2}: ${JSON.stringify(result.error.format(), null, 2)}`);
    }

    return result.data;
  });
  return callback(rows);
}
