import { z } from '@/libs/zod';
import type { PrismaClient } from '../../../generated/client';
import { parseCsv } from '../../helpers/parseCsv';

const AdministrativeRowSchema = z.object({
  'Entité administrative (parent)': z.string().min(1),
  'Direction (libellé long)': z.string().min(1),
  'Direction (libéllé court)': z.string().min(1),
});

export async function seedDirections(prisma: PrismaClient) {
  return await parseCsv('./prisma/documents/directions.csv', AdministrativeRowSchema, async (rows) => {
    const parentEntities = await prisma.entite.findMany({
      where: {
        OR: rows.map((row) => ({
          nomComplet: row['Entité administrative (parent)'],
          entiteMereId: null,
        })),
      },
      select: {
        nomComplet: true,
        id: true,
        entiteTypeId: true,
        entiteMere: true,
      },
    });

    const directionsWithParents = rows.map((row) => {
      const parent = parentEntities.find((p) => p.nomComplet === row['Entité administrative (parent)']);
      if (!parent) {
        throw new Error(`Missing parent for: ${row['Direction (libellé long)']}`);
      }
      return {
        nomComplet: row['Direction (libellé long)'],
        label: row['Direction (libéllé court)'],
        entiteTypeId: parent.entiteTypeId,
        entiteMereId: parent.id,
      };
    });

    const existing = await prisma.entite.findMany({
      where: {
        OR: directionsWithParents.map((dir) => ({
          nomComplet: dir.nomComplet,
          entiteMereId: dir.entiteMereId,
        })),
      },
      select: {
        nomComplet: true,
        entiteMereId: true,
      },
    });

    const newEntities = directionsWithParents.filter(
      (dir) => !existing.find((e) => e.nomComplet === dir.nomComplet && e.entiteMereId === dir.entiteMereId),
    );

    const createdEntities = await prisma.entite.createMany({
      data: newEntities,
    });

    return { table: 'directions in entite', added: createdEntities.count };
  });
}
