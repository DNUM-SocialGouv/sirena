import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findGeoByPostalCode } from './geoIndex.js';

vi.mock('../../../../libs/prisma.js', () => ({
  prisma: {
    inseePostal: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from '../../../../libs/prisma.js';

const mockedPrismaInseePostal = vi.mocked(prisma.inseePostal);

describe('findGeoByPostalCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return GeoEntite when InseePostal and Commune are found', async () => {
    const mockInseePostal = {
      id: 'test-id',
      codeInsee: '75056',
      nomCommune: 'Paris',
      codePostal: '75001',
      libelleAcheminement: null,
      ligne5: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      commune: {
        comCode: '75056',
        comLib: 'Paris',
        metomerLib: 'Métropole',
        ctcdCodeActuel: '75C',
        ctcdLibActuel: 'Ville de Paris',
        dptCodeActuel: '75',
        dptLibActuel: 'Paris',
        regCodeActuel: '11',
        regLibActuel: 'Île-de-France',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    mockedPrismaInseePostal.findFirst.mockResolvedValue(mockInseePostal);

    const result = await findGeoByPostalCode('75001');

    expect(result).toEqual({
      inseeCode: '75056',
      postalCode: '75001',
      departementCode: '75',
      ctcdCode: '75C',
      departementName: 'Paris',
      regionCode: '11',
      regionName: 'Île-de-France',
    });

    expect(mockedPrismaInseePostal.findFirst).toHaveBeenCalledWith({
      where: { codePostal: '75001' },
      include: { commune: true },
    });
  });

  it('should return null when InseePostal is not found', async () => {
    mockedPrismaInseePostal.findFirst.mockResolvedValue(null);

    const result = await findGeoByPostalCode('99999');

    expect(result).toBeNull();
    expect(mockedPrismaInseePostal.findFirst).toHaveBeenCalledWith({
      where: { codePostal: '99999' },
      include: { commune: true },
    });
  });

  it('should return null when InseePostal is found but Commune is null', async () => {
    const mockInseePostal = {
      id: 'test-id',
      codeInsee: '97701',
      nomCommune: 'ST BARTHELEMY',
      codePostal: '97133',
      libelleAcheminement: null,
      ligne5: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      commune: null,
    };

    mockedPrismaInseePostal.findFirst.mockResolvedValue(mockInseePostal);

    const result = await findGeoByPostalCode('97133');

    expect(result).toBeNull();
  });
});
