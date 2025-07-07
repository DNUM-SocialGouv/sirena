import type { PrismaClient } from 'generated/client';
import { z } from '@/libs/zod';
import { parseCsv } from '../../helpers/parseCsv';

const AdministrativeRowSchema = z.object({
  'Entité administrative (parent)': z.string().min(1),
  'Direction (libellé long)': z.string().min(1),
  'Direction (libéllé court)': z.string().min(1),
});

export async function seedDirections(prisma: PrismaClient) {
  return await parseCsv('./prisma/documents/directions.csv', AdministrativeRowSchema, async (rows) => {
    let added = 0;

    for (const row of rows) {
      const entite = await prisma.entite.findFirst({
        where: {
          nomComplet: row['Direction (libellé long)'],
          entiteMere: {
            nomComplet: row['Entité administrative (parent)'],
          },
        },
      });

      if (!entite) {
        const entiteParent = await prisma.entite.findFirst({
          where: { nomComplet: row['Entité administrative (parent)'], entiteMereId: null },
        });

        if (!entiteParent) {
          throw new Error(`Parent structure not found for entite: ${row['Entité administrative (parent)']}`);
        }

        added++;
        await prisma.entite.create({
          data: {
            nomComplet: row['Direction (libellé long)'],
            label: row['Direction (libéllé court)'],
            entiteType: { connect: { id: entiteParent.entiteTypeId } },
            entiteMere: { connect: { id: entiteParent.id } },
          },
        });
      }
    }

    return { table: 'directions in entite', added };
  });
}
