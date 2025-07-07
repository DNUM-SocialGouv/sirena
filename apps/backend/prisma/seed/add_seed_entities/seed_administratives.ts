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
    let added = 0;
    for (const row of rows) {
      const entite = await prisma.entite.findFirst({
        where: { nomComplet: row.Libellé, entiteMereId: null },
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
    return { table: 'administratives in entite', added };
  });
}
