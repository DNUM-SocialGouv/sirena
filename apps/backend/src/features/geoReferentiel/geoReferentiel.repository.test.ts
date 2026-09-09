import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../libs/prisma.js';
import {
  countPendingDeletions,
  loadExistingCommunes,
  loadExistingInseePostal,
  writeCommunes,
  writeInseePostal,
} from './geoReferentiel.repository.js';
import type { CommuneRow, InseePostalRow } from './geoReferentiel.type.js';

vi.mock('../../libs/prisma.js');

const commune = (comCode: string, overrides: Partial<CommuneRow> = {}): CommuneRow => ({
  comCode,
  comLib: `Commune ${comCode}`,
  metomerLib: 'Métropole',
  ctcdCodeActuel: '01D',
  ctcdLibActuel: "Conseil départemental de L'Ain",
  dptCodeActuel: '01',
  dptLibActuel: 'Ain',
  regCodeActuel: '84',
  regLibActuel: 'Auvergne-Rhône-Alpes',
  ...overrides,
});

const postal = (codeInsee: string, codePostal: string, overrides: Partial<InseePostalRow> = {}): InseePostalRow => ({
  codeInsee,
  codePostal,
  nomCommune: `COMMUNE ${codeInsee}`,
  libelleAcheminement: null,
  ligne5: null,
  ...overrides,
});

const asMap = <T extends { comCode: string }>(rows: T[]) => new Map(rows.map((row) => [row.comCode, row]));

beforeEach(() => {
  vi.mocked(prisma.$transaction).mockResolvedValue([]);
  vi.mocked(prisma.inseePostal.deleteMany).mockImplementation((async (args: { where: { id: { in: string[] } } }) => ({
    count: args.where.id.in.length,
    // biome-ignore lint/suspicious/noExplicitAny: signature Prisma simplifiée pour le test
  })) as any);
});

describe('loadExistingCommunes', () => {
  it('should index existing communes by their INSEE code', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: le select ne renvoie qu'un sous-ensemble du modèle
    vi.mocked(prisma.commune.findMany).mockResolvedValue([commune('01001'), commune('01002')] as any);

    const existing = await loadExistingCommunes();

    expect(existing.size).toBe(2);
    expect(existing.get('01001')?.comLib).toBe('Commune 01001');
  });
});

describe('loadExistingInseePostal', () => {
  it('should index existing rows by INSEE code and postal code', async () => {
    vi.mocked(prisma.inseePostal.findMany).mockResolvedValue([
      { id: 'a', ...postal('01001', '01400') },
      { id: 'b', ...postal('01001', '01401') },
      // biome-ignore lint/suspicious/noExplicitAny: le select ne renvoie qu'un sous-ensemble du modèle
    ] as any);

    const existing = await loadExistingInseePostal();

    expect([...existing.keys()]).toEqual(['01001|01400', '01001|01401']);
    expect(existing.get('01001|01400')?.id).toBe('a');
  });
});

describe('writeCommunes', () => {
  it('should create communes missing from the database', async () => {
    const result = await writeCommunes(asMap([commune('01001'), commune('01002')]), new Map());

    expect(result).toMatchObject({ created: 2, updated: 0, deleted: 0, orphans: 0 });
    expect(prisma.commune.createMany).toHaveBeenCalledWith({
      data: [commune('01001'), commune('01002')],
      skipDuplicates: true,
    });
  });

  it('should update only the communes whose data actually changed', async () => {
    const existing = asMap([commune('01001'), commune('01002')]);
    const source = asMap([commune('01001'), commune('01002', { ctcdCodeActuel: '69M', dptCodeActuel: '69' })]);

    const result = await writeCommunes(source, existing);

    expect(result).toMatchObject({ created: 0, updated: 1 });
    expect(prisma.commune.createMany).not.toHaveBeenCalled();
    expect(prisma.commune.update).toHaveBeenCalledTimes(1);
    expect(prisma.commune.update).toHaveBeenCalledWith(expect.objectContaining({ where: { comCode: '01002' } }));
  });

  it('should write nothing when the source matches the database', async () => {
    const rows = asMap([commune('01001')]);

    const result = await writeCommunes(rows, asMap([commune('01001')]));

    expect(result).toMatchObject({ created: 0, updated: 0 });
    expect(prisma.commune.createMany).not.toHaveBeenCalled();
    expect(prisma.commune.update).not.toHaveBeenCalled();
  });

  it('should report communes absent from the source without ever deleting them', async () => {
    const result = await writeCommunes(asMap([commune('01001')]), asMap([commune('01001'), commune('01999')]));

    expect(result.orphans).toBe(1);
    expect(result.deleted).toBe(0);
    expect(prisma.commune.deleteMany).not.toHaveBeenCalled();
  });

  it('should split creations into batches', async () => {
    const rows = asMap(Array.from({ length: 2_500 }, (_, i) => commune(String(i).padStart(5, '0'))));

    await writeCommunes(rows, new Map());

    expect(prisma.commune.createMany).toHaveBeenCalledTimes(3);
  });
});

describe('writeInseePostal', () => {
  const existing = new Map([
    ['01001|01400', { id: 'a', ...postal('01001', '01400') }],
    ['01002|01640', { id: 'b', ...postal('01002', '01640') }],
  ]);

  it('should create, update and delete according to the diff', async () => {
    const source = new Map([
      ['01001|01400', postal('01001', '01400', { libelleAcheminement: 'ABERGEMENT' })],
      ['01003|01500', postal('01003', '01500')],
    ]);

    const result = await writeInseePostal(source, existing, { applyDeletions: true });

    expect(result).toEqual({ created: 1, updated: 1, deleted: 1 });
    expect(prisma.inseePostal.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['b'] } } });
  });

  it('should keep rows untouched when nothing changed', async () => {
    const source = new Map([
      ['01001|01400', postal('01001', '01400')],
      ['01002|01640', postal('01002', '01640')],
    ]);

    const result = await writeInseePostal(source, existing, { applyDeletions: true });

    expect(result).toEqual({ created: 0, updated: 0, deleted: 0 });
    expect(prisma.inseePostal.createMany).not.toHaveBeenCalled();
    expect(prisma.inseePostal.update).not.toHaveBeenCalled();
    expect(prisma.inseePostal.deleteMany).not.toHaveBeenCalled();
  });

  it('should apply upserts but skip deletions when they are inhibited', async () => {
    const source = new Map([['01003|01500', postal('01003', '01500')]]);

    const result = await writeInseePostal(source, existing, { applyDeletions: false });

    expect(result).toMatchObject({ created: 1, deleted: 0 });
    expect(prisma.inseePostal.createMany).toHaveBeenCalled();
    expect(prisma.inseePostal.deleteMany).not.toHaveBeenCalled();
  });

  it('should update a row through its stored id', async () => {
    const source = new Map([
      ['01001|01400', postal('01001', '01400', { ligne5: 'LIEU DIT' })],
      ['01002|01640', postal('01002', '01640')],
    ]);

    await writeInseePostal(source, existing, { applyDeletions: true });

    expect(prisma.inseePostal.update).toHaveBeenCalledWith({
      where: { id: 'a' },
      data: { nomCommune: 'COMMUNE 01001', libelleAcheminement: null, ligne5: 'LIEU DIT' },
    });
  });
});

describe('countPendingDeletions', () => {
  it('should count existing rows missing from the source', () => {
    const existing = new Map([
      ['01001|01400', { id: 'a', ...postal('01001', '01400') }],
      ['01002|01640', { id: 'b', ...postal('01002', '01640') }],
    ]);

    expect(countPendingDeletions(new Map([['01001|01400', postal('01001', '01400')]]), existing)).toBe(1);
    expect(countPendingDeletions(existing, existing)).toBe(0);
  });
});
