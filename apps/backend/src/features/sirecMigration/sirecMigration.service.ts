import { prisma } from '@sirena/db';
import { UnrecoverableError } from 'bullmq';
import { isPrismaUniqueConstraintError } from '../../helpers/prisma.js';
import { getLoggerStore } from '../../libs/asyncLocalStorage.js';
import type { SirenaRequeteData } from './sirecMigration.transformer.js';

export async function getRequeteIdFromSirecId(sirecId: number): Promise<string | null> {
  const requete = await prisma.requete.findFirst({
    where: { sirecId },
    select: { id: true },
  });
  return requete ? requete.id : null;
}

export async function saveRequeteFromSirec(data: SirenaRequeteData): Promise<string | null> {
  const logger = getLoggerStore();

  try {
    const requete = await prisma.requete.create({
      data: {
        id: data.sirenaId,
        sirecId: data.sirecId,
      },
      select: { id: true },
    });

    logger.info({ requeteId: requete.id, sirecId: data.sirecId }, 'Requete created from SIREC');

    return requete.id;
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      logger.info({ err: error }, `Sirec record already exists, skipping SIREC import : ${data.sirecId}`);
      throw new UnrecoverableError(`Sirec record already exists, skipping SIREC import : ${data.sirecId}`);
    }
    return null;
  }
}
