import { prisma } from '../../libs/prisma.js';

export async function getEntiteAscendanteInfo(entiteId: string) {
  const CYCLE_LIMIT = 6;
  let currentEntiteId = entiteId;
  let n = 0;

  while (currentEntiteId) {
    n += 1;
    // Prevent infinite loop in case of cycle in entite hierarchy
    if (n > CYCLE_LIMIT) {
      break;
    }
    const lastEntiteId = await prisma.entite.findUnique({
      where: { id: currentEntiteId },
      select: { entiteMereId: true },
    });

    if (lastEntiteId === null) {
      return { entiteId: null, level: n };
    }

    if (!lastEntiteId.entiteMereId) {
      return { entiteId: currentEntiteId, level: n };
    }

    if (lastEntiteId.entiteMereId) {
      currentEntiteId = lastEntiteId.entiteMereId;
    }
  }

  // Should not happen
  throw new Error(`Possible cycle detected in entite hierarchy, ${entiteId}`);
}
