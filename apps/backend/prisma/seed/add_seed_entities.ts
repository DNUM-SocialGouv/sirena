import { readFile } from 'node:fs/promises';
import { z } from '@/libs/zod';
import type { PrismaClient } from 'generated/client';

const StructureRowSchema = z.object({
  Libellé: z.string().min(1),
  'Libéllé court': z.string().min(1),
  "Type d'entité": z.string().min(1),
  'Domaine mail': z
    .string()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  Organizational_unit: z
    .string()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
});

type StructureRow = z.infer<typeof StructureRowSchema>;

async function seedStructure(prisma: PrismaClient) {
  const csvRaw = await readFile('./prisma/documents/structures.csv', 'utf8');

  const [headerLine, ...lines] = csvRaw.trim().split('\n');
  const headers = headerLine.split(';');

  const rows: StructureRow[] = lines.map((line, i) => {
    const values = line.split(';');

    if (values.length !== headers.length) {
      throw new Error(`Malformed CSV on line ${i + 2}: "${line}"`);
    }

    const raw = Object.fromEntries(headers.map((h, idx) => [h.trim(), values[idx]?.trim() ?? '']));

    const result = StructureRowSchema.safeParse(raw);

    if (!result.success) {
      throw new Error(`Invalid data on line ${i + 2}: ${JSON.stringify(result.error.format(), null, 2)}`);
    }

    return result.data;
  });

  let added = 0;

  for (const row of rows) {
    const entite = await prisma.entite.findFirst({
      where: { nomComplet: row.Libellé },
    });

    if (!entite) {
      added++;
      await prisma.entite.create({
        data: {
          nomComplet: row.Libellé,
          label: row['Libéllé court'],
          emailDomain: row['Domaine mail'],
          organizationUnit: row.Organizational_unit,
          entiteType: { connect: { id: row["Type d'entité"] } },
        },
      });
    }
  }

  return { table: 'structures in entite', added };
}

type ServiceRow = {
  Structure: string;
  Service: string;
  Catégorie: string;
};

async function seedService(prisma: PrismaClient) {
  const csvRaw = await readFile('./prisma/documents/services.csv', 'utf8');

  const [headerLine, ...lines] = csvRaw.trim().split('\n');
  const headers = headerLine.split(',');

  const rows: ServiceRow[] = lines.map((line, i) => {
    const values = line.split(',');

    if (values.length !== headers.length) {
      throw new Error(`Malformed CSV on line ${i + 2}: "${line}"`);
    }

    const obj = Object.fromEntries(headers.map((h, idx) => [h.trim(), values[idx].trim()]));
    return {
      Structure: obj.Structure,
      Service: obj.Service,
      Catégorie: obj.Catégorie,
    };
  });

  let added = 0;

  for (const row of rows) {
    const entite = await prisma.entite.findFirst({
      where: { nomComplet: row.Service },
    });

    if (!entite) {
      const entiteParent = await prisma.entite.findFirst({
        where: { nomComplet: row.Structure },
      });

      if (!entiteParent) {
        throw new Error(`Parent structure not found for service: ${row.Service}`);
      }

      added++;
      await prisma.entite.create({
        data: {
          nomComplet: row.Service,
          label: row.Service,
          entiteType: { connect: { id: entiteParent.entiteTypeId } },
          entiteMere: { connect: { id: entiteParent.id } },
        },
      });
    }
  }

  return { table: 'services in entite', added };
}

export async function seedEntites(prisma: PrismaClient) {
  console.log('🌱 Début du seeding des des entites...');
  const results: { table: string; added: number }[] = [];

  try {
    results.push(await seedStructure(prisma));
    results.push(await seedService(prisma));
  } catch (error) {
    console.error('❌ Erreur pendant le seeding des entites:', error);
    throw error;
  }

  for (const result of results) {
    console.log(`✅ ${result.table} : ${result.added} ajoutés`);
  }

  console.log('🎉 Seeding pour des entites terminé !');
}
