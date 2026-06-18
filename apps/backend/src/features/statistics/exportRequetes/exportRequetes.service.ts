import { type Prisma, prisma } from '../../../libs/prisma.js';
import { getEntiteDescendantIds } from '../../entites/entites.service.js';
import { buildExportRequetesCsvFromRecords } from './exportRequetesCsv.js';
import type { ExportRequeteRecord } from './exportRequetesRows.js';

const exportRequetesInclude = {
  situations: true,
} satisfies Prisma.RequeteInclude;

type ExportRequetePrismaPayload = Prisma.RequeteGetPayload<{
  include: typeof exportRequetesInclude;
}>;

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
    include: exportRequetesInclude,
  });

  return buildExportRequetesCsvFromRecords(requetes.map(toExportRequeteRecord));
}

function toExportRequeteRecord(requete: ExportRequetePrismaPayload): ExportRequeteRecord {
  return {
    id: requete.id,
    createdAt: requete.createdAt,
    situations: requete.situations.map(() => ({})),
  };
}
