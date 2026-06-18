import { prisma } from '../../../libs/prisma.js';
import { getEntiteDescendantIds } from '../../entites/entites.service.js';
import { buildExportRequetesCsvFromRecords } from './exportRequetesCsv.js';
import type { ExportRequeteRecord } from './exportRequetesRows.js';

export async function generateExportRequetesCsv(topEntiteId: string): Promise<string> {
  const entiteIds = await getEntiteDescendantIds(topEntiteId);
  const requetes = await prisma.requete.findMany({
    where: {
      requeteEntites: {
        some: {
          entiteId: { in: entiteIds ?? [] },
        },
      },
    },
    include: {
      situations: true,
    },
  });

  return buildExportRequetesCsvFromRecords(requetes as unknown as ExportRequeteRecord[]);
}
