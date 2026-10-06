import {
  dsLieuTypeLabels,
  dsMisEnCauseTypeLabels,
  dsProfessionDomicileTypeLabels,
  dsProfessionTypeLabels,
} from '@sirena/common/constants';
import { describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../libs/__mocks__/prisma.js';
import {
  getAgeEnums,
  getAutoriteTypeEnums,
  getCiviliteEnums,
  getConsequenceEnums,
  getDemarcheEnums,
  getLienVictimeEnums,
  getLieuTypeEnums,
  getMaltraitanceTypeEnums,
  getMisEnCausePrecisionsTypeEnums,
  getMisEnCauseTypeEnums,
  getMotifDeclaratifEnums,
} from './enums.service.js';

vi.mock('../../../libs/prisma.js');

const rows = [{ id: 'A', label: 'Libellé A' }];

describe('third-party v1 enums.service.ts', () => {
  it.each([
    ['getAgeEnums', getAgeEnums, prisma.ageEnum],
    ['getCiviliteEnums', getCiviliteEnums, prisma.civiliteEnum],
    ['getLienVictimeEnums', getLienVictimeEnums, prisma.lienVictimeEnum],
    ['getDemarcheEnums', getDemarcheEnums, prisma.demarchesEngageesEnum],
    ['getAutoriteTypeEnums', getAutoriteTypeEnums, prisma.autoriteTypeEnum],
    ['getMotifDeclaratifEnums', getMotifDeclaratifEnums, prisma.motifDeclaratifEnum],
    ['getConsequenceEnums', getConsequenceEnums, prisma.consequenceEnum],
    ['getMaltraitanceTypeEnums', getMaltraitanceTypeEnums, prisma.maltraitanceTypeEnum],
  ])('%s reads the whole referential table', async (_, fn, delegate) => {
    // biome-ignore lint/suspicious/noExplicitAny: delegates have distinct row types
    (delegate.findMany as any).mockResolvedValueOnce(rows);

    await expect(fn()).resolves.toEqual(rows);
    expect(delegate.findMany).toHaveBeenCalledWith();
  });

  it('getLieuTypeEnums exposes every DematSocial lieu type as key/value', () => {
    expect(getLieuTypeEnums()).toEqual(Object.entries(dsLieuTypeLabels).map(([key, value]) => ({ key, value })));
  });

  it('getMisEnCauseTypeEnums exposes every DematSocial mis en cause type as key/value', () => {
    const result = getMisEnCauseTypeEnums();

    expect(result).toHaveLength(Object.keys(dsMisEnCauseTypeLabels).length);
    expect(result).toContainEqual({ key: 'ETABLISSEMENT', value: dsMisEnCauseTypeLabels.ETABLISSEMENT });
  });

  it('getMisEnCausePrecisionsTypeEnums groups profession and domicile precisions', () => {
    expect(getMisEnCausePrecisionsTypeEnums()).toEqual({
      profession: Object.entries(dsProfessionTypeLabels).map(([key, value]) => ({ key, value })),
      professionDomicile: Object.entries(dsProfessionDomicileTypeLabels).map(([key, value]) => ({ key, value })),
    });
  });
});
