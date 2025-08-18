import { beforeEach } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '../../../generated/client/index.js';

beforeEach(() => {
  mockReset(prisma);
});

export const prisma = mockDeep<PrismaClient>();
