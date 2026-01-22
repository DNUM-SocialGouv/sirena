import { z } from 'zod';
import type { Prisma, PrismaClient } from '../../../generated/client/index.js';
import { parseCsv } from '../../helpers/parseCsv.js';
import { normalizeParentName } from './utils.js';

const ServiceRowSchema = z.object({
  'Entité administrative': z.string().min(1),
  'Direction (libellé long)': z.string().min(1),
  'Service (libellé long)': z.string().min(1),
  'Service (libellé court)': z.string().min(1),
  Actif: z
    .string()
    .optional()
    .default('false')
    .transform((v) => v === 'true' || v === '1' || v === 'TRUE' || v === 'True' || v === 'Oui' || v === 'oui'),
});

export async function seedServices(prisma: PrismaClient | Prisma.TransactionClient) {
  return await parseCsv('./prisma/documents/services.csv', ServiceRowSchema, async (rows) => {
    const parentEntities = await prisma.entite.findMany({
      where: {
        entiteMere: {
          is: {
            entiteMereId: null, // Get directions
          },
        },
      },
      select: {
        nomComplet: true,
        id: true,
        entiteTypeId: true,
        entiteMere: {
          select: {
            nomComplet: true,
          },
        },
      },
    });

    const parentNormalizedNameMap = new Map<string, (typeof parentEntities)[number]>();

    for (const parent of parentEntities) {
      if (!parent.entiteMere) continue; // safety
      const adminName = normalizeParentName(parent.entiteMere.nomComplet);
      const directionName = normalizeParentName(parent.nomComplet);
      const key = `${adminName}|${directionName}`;
      parentNormalizedNameMap.set(key, parent);
    }

    const servicesWithParents = rows.map((row) => {
      const rawAdminName = row['Entité administrative'];
      const rawDirectionName = row['Direction (libellé long)'];

      const adminKey = normalizeParentName(rawAdminName);
      const directionKey = normalizeParentName(rawDirectionName);
      const key = `${adminKey}|${directionKey}`;

      const parent = parentNormalizedNameMap.get(key);

      if (!parent) {
        throw new Error(
          `Parent not found for service "${row['Service (libellé long)']}" (admin: "${rawAdminName}", direction: "${rawDirectionName}", key: "${key}")`,
        );
      }

      return {
        nomComplet: row['Service (libellé long)'],
        label: row['Service (libellé court)'],
        entiteTypeId: parent.entiteTypeId,
        entiteMereId: parent.id,
        isActive: row.Actif,
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
