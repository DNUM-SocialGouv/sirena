import { prisma } from '@sirena/db';
import { getLoggerStore } from '../../libs/asyncLocalStorage.js';
import type { SirenaRequeteData } from './sirecMigration.transformer.js';

export async function getRequeteIdFromSirecId(sirecId: number): Promise<string | null> {
  const requete = await prisma.requete.findFirst({
    where: { sirecId },
    select: { id: true },
  });
  return requete ? requete.id : null;
}

export async function saveRequeteFromSirec(data: SirenaRequeteData): Promise<string> {
  const logger = getLoggerStore();

  const requete = await prisma.requete.create({
    data: {
      id: data.sirenaId,
      sirecId: data.sirecId,
      receptionDate: data.receptionDate,
    },
    select: { id: true },
  });

  logger.info({ requeteId: requete.id, sirecId: data.sirecId }, 'Requete created from SIREC');

  return requete.id;
}
