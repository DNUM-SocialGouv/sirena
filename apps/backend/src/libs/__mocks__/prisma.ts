import type { PrismaClient } from '@sirena/db';
import { beforeEach } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';

// Le vrai namespace, pas un mock : `Prisma.sql` et `Prisma.join` construisent les requêtes du
// code testé, ils n'ont aucun état de client à simuler. Sans ce réexport, tout module qui les
// utilise reçoit `undefined` dès que ses tests remplacent `libs/prisma`.
export { Prisma } from '@sirena/db';

beforeEach(() => {
  mockReset(prisma);
});

export const prisma = mockDeep<PrismaClient>();
