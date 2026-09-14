import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../libs/prisma.js';
import { GEO_GUARDS } from './geoReferentiel.constant.js';
import {
  applyGeoReferentiel,
  diffCommunes,
  diffInseePostal,
  loadExistingCommunes,
  loadExistingInseePostal,
} from './geoReferentiel.repository.js';
import type { CommuneRow, InseePostalRow, StoredInseePostal } from './geoReferentiel.type.js';

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

const storedPostal = new Map<string, StoredInseePostal>([
  ['01001|01400', { id: 'a', ...postal('01001', '01400') }],
  ['01002|01640', { id: 'b', ...postal('01002', '01640') }],
]);

const noCommuneWrite = { toCreate: [], toUpdate: [], orphans: 0 };
const noPostalWrite = { toCreate: [], toUpdate: [], idsToDelete: [] };

// `$executeRaw` est appelé en littéral balisé : le premier argument porte les fragments de
// requête, le second le `Prisma.Sql` interpolé et donc les paramètres.
const executeRawCall = (index: number) => vi.mocked(prisma.$executeRaw).mock.calls[index];
const sqlTextOf = (index: number) => (executeRawCall(index)[0] as unknown as string[]).join(' ? ');
const sqlValuesOf = (index: number) => (executeRawCall(index)[1] as unknown as { values: unknown[] }).values;

beforeEach(() => {
  // La transaction interactive rejoue le client mocké : les écritures restent observables.
  vi.mocked(prisma.$transaction).mockImplementation(
    (async (run: (tx: typeof prisma) => Promise<void>) =>
      // biome-ignore lint/suspicious/noExplicitAny: signature Prisma simplifiée pour le test
      await run(prisma)) as any,
  );
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

describe('diffCommunes', () => {
  it('should create communes missing from the database', () => {
    const diff = diffCommunes(asMap([commune('01001'), commune('01002')]), new Map());

    expect(diff.toCreate).toEqual([commune('01001'), commune('01002')]);
    expect(diff.toUpdate).toEqual([]);
  });

  it('should update only the communes whose data actually changed', () => {
    const existing = asMap([commune('01001'), commune('01002')]);
    const source = asMap([commune('01001'), commune('01002', { ctcdCodeActuel: '69M', dptCodeActuel: '69' })]);

    const diff = diffCommunes(source, existing);

    expect(diff.toCreate).toEqual([]);
    expect(diff.toUpdate).toEqual([commune('01002', { ctcdCodeActuel: '69M', dptCodeActuel: '69' })]);
  });

  it('should write nothing when the source matches the database', () => {
    const diff = diffCommunes(asMap([commune('01001')]), asMap([commune('01001')]));

    expect(diff).toEqual({ toCreate: [], toUpdate: [], orphans: 0 });
  });

  it('should report communes absent from the source without ever deleting them', () => {
    const diff = diffCommunes(asMap([commune('01001')]), asMap([commune('01001'), commune('01999')]));

    expect(diff.orphans).toBe(1);
    expect(diff.toCreate).toEqual([]);
    expect(diff.toUpdate).toEqual([]);
  });
});

describe('diffInseePostal', () => {
  it('should sort each row into a creation, an update or a deletion', () => {
    const source = new Map([
      ['01001|01400', postal('01001', '01400', { libelleAcheminement: 'ABERGEMENT' })],
      ['01003|01500', postal('01003', '01500')],
    ]);

    const diff = diffInseePostal(source, storedPostal);

    expect(diff.toCreate).toEqual([postal('01003', '01500')]);
    expect(diff.toUpdate).toEqual([{ id: 'a', row: postal('01001', '01400', { libelleAcheminement: 'ABERGEMENT' }) }]);
    expect(diff.idsToDelete).toEqual(['b']);
  });

  it('should leave everything untouched when nothing changed', () => {
    const source = new Map([
      ['01001|01400', postal('01001', '01400')],
      ['01002|01640', postal('01002', '01640')],
    ]);

    expect(diffInseePostal(source, storedPostal)).toEqual({ toCreate: [], toUpdate: [], idsToDelete: [] });
  });

  it('should list every row missing from the source as a deletion', () => {
    const diff = diffInseePostal(new Map(), storedPostal);

    expect(diff.idsToDelete).toEqual(['a', 'b']);
  });
});

describe('applyGeoReferentiel', () => {
  it('should apply both referentiels inside a single transaction', async () => {
    await applyGeoReferentiel({ toCreate: [commune('01001')], toUpdate: [], orphans: 0 }, noPostalWrite, {
      applyDeletions: true,
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      timeout: GEO_GUARDS.WRITE_TIMEOUT_MS,
    });
  });

  it('should write the communes before the postal codes that reference them', async () => {
    await applyGeoReferentiel(
      { toCreate: [commune('01003')], toUpdate: [], orphans: 0 },
      { toCreate: [postal('01003', '01500')], toUpdate: [], idsToDelete: [] },
      { applyDeletions: true },
    );

    expect(vi.mocked(prisma.commune.createMany).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(prisma.inseePostal.createMany).mock.invocationCallOrder[0],
    );
  });

  it('should split creations into batches', async () => {
    const toCreate = Array.from({ length: 2_500 }, (_, i) => commune(String(i).padStart(5, '0')));

    await applyGeoReferentiel({ toCreate, toUpdate: [], orphans: 0 }, noPostalWrite, { applyDeletions: true });

    const batchSizes = vi
      .mocked(prisma.commune.createMany)
      .mock.calls.map(([args]) => (args as { data: CommuneRow[] }).data.length);
    expect(batchSizes).toEqual([GEO_GUARDS.BATCH_SIZE, GEO_GUARDS.BATCH_SIZE, 500]);
  });

  it('should update a commune through its INSEE code', async () => {
    await applyGeoReferentiel(
      { toCreate: [], toUpdate: [commune('01002', { dptCodeActuel: '69' })], orphans: 0 },
      noPostalWrite,
      { applyDeletions: true },
    );

    expect(sqlTextOf(0)).toContain('UPDATE "Commune"');
    expect(sqlValuesOf(0)).toContain('01002');
    expect(sqlValuesOf(0)).toContain('69');
  });

  it('should update a postal row through its stored id', async () => {
    await applyGeoReferentiel(
      noCommuneWrite,
      { toCreate: [], toUpdate: [{ id: 'a', row: postal('01001', '01400', { ligne5: 'LIEU DIT' }) }], idsToDelete: [] },
      { applyDeletions: true },
    );

    expect(sqlTextOf(0)).toContain('UPDATE "InseePostal"');
    expect(sqlValuesOf(0)).toEqual(['a', 'COMMUNE 01001', null, 'LIEU DIT']);
  });

  // Le SQL brut court-circuite le `@updatedAt` de Prisma : sans cette colonne posée à la main,
  // les lignes rafraîchies garderaient la date de leur dernière écriture par le client.
  it('should stamp updatedAt itself, since raw SQL bypasses Prisma', async () => {
    await applyGeoReferentiel({ toCreate: [], toUpdate: [commune('01002')], orphans: 0 }, noPostalWrite, {
      applyDeletions: true,
    });

    expect(sqlTextOf(0)).toContain('"updatedAt" = NOW()');
  });

  // Une boucle d'update ferait un aller-retour par ligne. Sur la première synchronisation d'un
  // environnement déjà peuplé, la table entière est à réécrire et la transaction expirerait.
  it('should group updates into one statement per batch', async () => {
    const toUpdate = Array.from({ length: 2_500 }, (_, i) => commune(String(i).padStart(5, '0')));

    await applyGeoReferentiel({ toCreate: [], toUpdate, orphans: 0 }, noPostalWrite, { applyDeletions: true });

    expect(vi.mocked(prisma.$executeRaw)).toHaveBeenCalledTimes(3);
    expect(sqlValuesOf(0)).toHaveLength(GEO_GUARDS.BATCH_SIZE * 9);
    expect(sqlValuesOf(2)).toHaveLength(500 * 9);
  });

  it('should delete the postal rows missing from the source', async () => {
    await applyGeoReferentiel(
      noCommuneWrite,
      { toCreate: [], toUpdate: [], idsToDelete: ['b'] },
      {
        applyDeletions: true,
      },
    );

    expect(prisma.inseePostal.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['b'] } } });
  });

  it('should apply creations but skip deletions when they are inhibited', async () => {
    await applyGeoReferentiel(
      noCommuneWrite,
      { toCreate: [postal('01003', '01500')], toUpdate: [], idsToDelete: ['b'] },
      { applyDeletions: false },
    );

    expect(prisma.inseePostal.createMany).toHaveBeenCalled();
    expect(prisma.inseePostal.deleteMany).not.toHaveBeenCalled();
  });

  it('should touch nothing when both diffs are empty', async () => {
    await applyGeoReferentiel(noCommuneWrite, noPostalWrite, { applyDeletions: true });

    expect(prisma.commune.createMany).not.toHaveBeenCalled();
    expect(prisma.inseePostal.createMany).not.toHaveBeenCalled();
    expect(prisma.inseePostal.deleteMany).not.toHaveBeenCalled();
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });
});
