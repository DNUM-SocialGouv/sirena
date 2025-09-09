import type { PrismaClient } from 'generated/client';
import { z } from '@/libs/zod';
import { parseCsv } from '../../helpers/parseCsv';

const AdministrativeRowSchema = z.object({
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

export async function seedAdministratives(prisma: PrismaClient) {
  return await parseCsv('./prisma/documents/administratives.csv', AdministrativeRowSchema, async (rows) => {
    const existing = await prisma.entite.findMany({
      where: {
        OR: rows.map((row) => ({
          nomComplet: row.Libellé,
          entiteMereId: null,
        })),
      },
      select: {
        nomComplet: true,
        entiteMereId: true,
      },
    });

    const newEntities = rows
      .filter((row) => !existing.find((e) => e.nomComplet === row.Libellé && e.entiteMereId === null))
      .map((row) => ({
        nomComplet: row.Libellé,
        label: row['Libéllé court'],
        emailDomain: row['Domaine mail'] ?? '',
        organizationalUnit: row.Organizational_unit ?? '',
        entiteTypeId: row["Type d'entité"],
      }));

    const createdEntities = await prisma.entite.createMany({
      data: newEntities,
      skipDuplicates: true,
    });

    return { table: 'administratives in entite', added: createdEntities.count };
  });
}
