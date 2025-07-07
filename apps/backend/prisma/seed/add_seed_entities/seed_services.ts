import type { PrismaClient } from 'generated/client';
import { z } from '@/libs/zod';
import { parseCsv } from '../../helpers/parseCsv';

const ServiceRowSchema = z.object({
  'Entité administrative': z.string().min(1),
  'Direction (libellé long)': z.string().min(1),
  'Service (libellé long)': z.string().min(1),
  'Service (libellé court)': z.string().min(1),
});

export async function seedServices(prisma: PrismaClient) {
  return await parseCsv('./prisma/documents/services.csv', ServiceRowSchema, async (rows) => {
    let added = 0;

    for (const row of rows) {
      const entite = await prisma.entite.findFirst({
        where: {
          nomComplet: row['Service (libellé long)'],
          entiteMere: {
            nomComplet: row['Direction (libellé long)'],
            entiteMere: {
              nomComplet: row['Entité administrative'],
              entiteMereId: null,
            },
          },
        },
      });

      if (!entite) {
        const entiteParent = await prisma.entite.findFirst({
          where: {
            nomComplet: row['Direction (libellé long)'],
            entiteMere: {
              nomComplet: row['Entité administrative'],
              entiteMereId: null,
            },
          },
        });

        if (!entiteParent) {
          throw new Error(`Parent structure not found for service: ${row['Direction (libellé long)']}`);
        }

        added++;
        await prisma.entite.create({
          data: {
            nomComplet: row['Service (libellé long)'],
            label: row['Service (libellé court)'],
            entiteType: { connect: { id: entiteParent.entiteTypeId } },
            entiteMere: { connect: { id: entiteParent.id } },
          },
        });
      }
    }
    return { table: 'services in entite', added };
  });
}
