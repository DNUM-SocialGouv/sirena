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
    const parentEntities = await prisma.entite.findMany({
      where: {
        OR: rows.map((row) => ({
          nomComplet: row['Direction (libellé long)'],
          entiteMere: {
            nomComplet: row['Entité administrative'],
            entiteMereId: null,
          },
        })),
      },
      select: {
        nomComplet: true,
        id: true,
        entiteTypeId: true,
        entiteMere: true,
      },
    });

    const servicesWithParents = rows.map((row) => {
      const parent = parentEntities.find(
        (p) =>
          p.nomComplet === row['Direction (libellé long)'] && p.entiteMere?.nomComplet === row['Entité administrative'],
      );
      if (!parent) {
        throw new Error(`Parent not found for service: ${row['Service (libellé long)']}`);
      }

      return {
        nomComplet: row['Service (libellé long)'],
        label: row['Service (libellé court)'],
        entiteTypeId: parent.entiteTypeId,
        entiteMereId: parent.id,
      };
    });

    const existing = await prisma.entite.findMany({
      where: {
        OR: servicesWithParents.map((s) => ({
          nomComplet: s.nomComplet,
          entiteMereId: s.entiteMereId,
        })),
      },
      select: {
        nomComplet: true,
        entiteMereId: true,
      },
    });

    const newEntities = servicesWithParents.filter(
      (s) => !existing.find((e) => e.nomComplet === s.nomComplet && e.entiteMereId === s.entiteMereId),
    );

    const createdEntities = await prisma.entite.createMany({
      data: newEntities,
      skipDuplicates: true,
    });

    return { table: 'services in entite', added: createdEntities.count };
  });
}
