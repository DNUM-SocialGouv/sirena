import { SIREC_ONLY_MOTIF_DECLARATIF_IDS } from '@sirena/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../libs/prisma.js';
import { getMotifDeclaratifEnums } from './enums.service.js';

vi.mock('../../../libs/prisma.js', () => ({
  prisma: {
    motifDeclaratifEnum: {
      findMany: vi.fn(),
    },
  },
}));

const mockedMotifDeclaratifEnum = vi.mocked(prisma.motifDeclaratifEnum);

describe('Third-party enums service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('excludes SIREC-only motifs so the endpoint only advertises values the FaitSchema accepts', async () => {
    mockedMotifDeclaratifEnum.findMany.mockResolvedValue([]);

    await getMotifDeclaratifEnums();

    expect(mockedMotifDeclaratifEnum.findMany).toHaveBeenCalledWith({
      where: { id: { notIn: SIREC_ONLY_MOTIF_DECLARATIF_IDS } },
    });
  });
});
