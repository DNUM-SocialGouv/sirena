import { prisma } from '@sirena/db';
import { logMessage } from '../../utils/logs.js';
import type { SirenaRequete } from '../type.js';

export async function saveTransformedDataToSirena(sirenaRequete: SirenaRequete) {
  logMessage('Sauvegarde dans SIRENA', sirenaRequete.id);
  return prisma.requete.create({
    data: {
      id: sirenaRequete.id,
    },
  });
}
