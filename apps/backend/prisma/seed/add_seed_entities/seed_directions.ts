import { z } from '@/libs/zod';
import type { PrismaClient } from '../../../generated/client';
import { parseCsv } from '../../helpers/parseCsv';
import { normalizeParentName } from './utils';

const AdministrativeRowSchema = z.object({
  'Entité administrative (parent)': z.string().min(1),
  'Direction (libellé long)': z.string().min(1),
  'Direction (libéllé court)': z.string().min(1),
});

export async function seedDirections(prisma: PrismaClient) {
  return await parseCsv('./prisma/documents/directions.csv', AdministrativeRowSchema, async (rows) => {
    const parentEntities = await prisma.entite.findMany({
      where: {
        entiteMereId: null,
      },
      select: {
        nomComplet: true,
        id: true,
        entiteTypeId: true,
        entiteMere: true,
      },
    });

    const parentNormalizedNameMap = new Map<string, (typeof parentEntities)[number]>();

    for (const parent of parentEntities) {
      const key = normalizeParentName(parent.nomComplet);
      parentNormalizedNameMap.set(key, parent);
    }

    const directionsWithParents = rows.map((row) => {
      const rawParentName = row['Entité administrative (parent)'];
      const parentKey = normalizeParentName(rawParentName);
      const parent = parentNormalizedNameMap.get(parentKey);

      if (!parent) {
        throw new Error(
          `Missing parent "${rawParentName}" (normalized: "${parentKey}") for: ${row['Direction (libellé long)']}`,
        );
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
