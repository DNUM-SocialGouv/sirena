import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildEntiteCoverageReport } from './geoReferentiel.coverage.js';
import { parseCommunes, parseInseePostal } from './geoReferentiel.parser.js';
import {
  countPendingDeletions,
  loadExistingCommunes,
  loadExistingInseePostal,
  writeCommunes,
  writeInseePostal,
} from './geoReferentiel.repository.js';
import { GeoReferentielGuardError, syncGeoReferentiel } from './geoReferentiel.service.js';
import type { CommuneRow, InseePostalRow } from './geoReferentiel.type.js';

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

vi.mock('../../libs/asyncLocalStorage.js', () => ({ getLoggerStore: () => logger }));
vi.mock('../../config/env.js', () => ({
  envVars: {
    GEO_REFERENTIEL_COMMUNES_URL: 'https://example.test/communes.csv',
    GEO_REFERENTIEL_POSTAL_URL: 'https://example.test/postal.csv',
  },
}));
vi.mock('./geoReferentiel.download.js', () => ({
  fetchCsvLines: vi.fn(() => (async function* () {})()),
}));
vi.mock('./geoReferentiel.parser.js', () => ({ parseCommunes: vi.fn(), parseInseePostal: vi.fn() }));
vi.mock('./geoReferentiel.repository.js', () => ({
  loadExistingCommunes: vi.fn(),
  loadExistingInseePostal: vi.fn(),
  writeCommunes: vi.fn(),
  writeInseePostal: vi.fn(),
  countPendingDeletions: vi.fn(),
}));
vi.mock('./geoReferentiel.coverage.js', () => ({ buildEntiteCoverageReport: vi.fn() }));

const communeRows = (count: number) =>
  new Map<string, CommuneRow>(
    Array.from({ length: count }, (_, i) => {
      const comCode = String(i).padStart(5, '0');
      return [
        comCode,
        {
          comCode,
          comLib: 'Commune',
          metomerLib: 'Métropole',
          ctcdCodeActuel: '01D',
          ctcdLibActuel: 'CD',
          dptCodeActuel: '01',
          dptLibActuel: 'Ain',
          regCodeActuel: '84',
          regLibActuel: 'ARA',
        },
      ];
    }),
  );

const postalRows = (count: number) =>
  new Map<string, InseePostalRow>(
    Array.from({ length: count }, (_, i) => {
      const key = String(i).padStart(5, '0');
      return [
        `${key}|01400`,
        { codeInsee: key, codePostal: '01400', nomCommune: 'COMMUNE', libelleAcheminement: null, ligne5: null },
      ];
    }),
  );

const givenSources = (
  communeCount = 36_000,
  postalCount = 35_000,
  overrides: { malformedCommunes?: number; orphanRows?: number; malformedPostal?: number } = {},
) => {
  vi.mocked(parseCommunes).mockResolvedValue({
    rows: communeRows(communeCount),
    malformedRows: overrides.malformedCommunes ?? 0,
    totalRows: communeCount,
  });
  vi.mocked(parseInseePostal).mockResolvedValue({
    rows: postalRows(postalCount),
    malformedRows: overrides.malformedPostal ?? 0,
    duplicateRows: 3_681,
    orphanRows: overrides.orphanRows ?? 1,
    totalRows: postalCount,
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  givenSources();
  vi.mocked(loadExistingCommunes).mockResolvedValue(new Map());
  vi.mocked(loadExistingInseePostal).mockResolvedValue(new Map());
  vi.mocked(countPendingDeletions).mockReturnValue(0);
  vi.mocked(writeCommunes).mockResolvedValue({ created: 10, updated: 2, deleted: 0, orphans: 0 });
  vi.mocked(writeInseePostal).mockResolvedValue({ created: 5, updated: 1, deleted: 0 });
  vi.mocked(buildEntiteCoverageReport).mockResolvedValue({
    territoiresCount: 111,
    missingCdCount: 0,
    missingDdCount: 0,
    missing: [],
  });
});

describe('syncGeoReferentiel', () => {
  it('should report what was written on the nominal path', async () => {
    const result = await syncGeoReferentiel();

    expect(result).toMatchObject({
      skipped: false,
      communes: { created: 10, updated: 2 },
      inseePostal: { created: 5, updated: 1 },
      duplicateRows: 3_681,
      orphanPostalRows: 1,
      deletionsSkipped: false,
    });
  });

  it('should read communes before postal codes, and filter the latter on the former', async () => {
    await syncGeoReferentiel();

    const [, knownComCodes] = vi.mocked(parseInseePostal).mock.calls[0];
    expect(knownComCodes.size).toBe(36_000);
  });

  it('should refuse a truncated commune file without writing anything', async () => {
    givenSources(1_000);

    await expect(syncGeoReferentiel()).rejects.toThrow(GeoReferentielGuardError);
    expect(writeCommunes).not.toHaveBeenCalled();
    expect(writeInseePostal).not.toHaveBeenCalled();
  });

  it('should refuse a truncated postal file without writing anything', async () => {
    givenSources(36_000, 100);

    await expect(syncGeoReferentiel()).rejects.toThrow(/codes postaux tronqué/);
    expect(writeCommunes).not.toHaveBeenCalled();
  });

  it('should refuse a file whose malformed rows exceed the tolerance', async () => {
    givenSources(36_000, 35_000, { malformedCommunes: 500 });

    await expect(syncGeoReferentiel()).rejects.toThrow(/illisibles/);
    expect(writeCommunes).not.toHaveBeenCalled();
  });

  it('should refuse desynchronised sources revealed by orphan postal codes', async () => {
    givenSources(36_000, 35_000, { orphanRows: 5_000 });

    await expect(syncGeoReferentiel()).rejects.toThrow(/commune inconnue/);
    expect(writeCommunes).not.toHaveBeenCalled();
  });

  it('should tolerate the single known orphan, Monaco', async () => {
    givenSources(36_000, 35_000, { orphanRows: 1 });

    await expect(syncGeoReferentiel()).resolves.toMatchObject({ orphanPostalRows: 1 });
  });

  it('should skip deletions when they are massive, while still applying additions', async () => {
    vi.mocked(loadExistingInseePostal).mockResolvedValue(new Map(postalRows(35_000).entries()) as never);
    vi.mocked(countPendingDeletions).mockReturnValue(10_000);

    const result = await syncGeoReferentiel();

    expect(result.deletionsSkipped).toBe(true);
    expect(writeInseePostal).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      applyDeletions: false,
      dryRun: false,
    });
    expect(logger.error).toHaveBeenCalled();
  });

  it('should apply massive deletions when they are explicitly forced', async () => {
    vi.mocked(loadExistingInseePostal).mockResolvedValue(new Map(postalRows(35_000).entries()) as never);
    vi.mocked(countPendingDeletions).mockReturnValue(10_000);

    const result = await syncGeoReferentiel({ force: true });

    expect(result.deletionsSkipped).toBe(false);
    expect(writeInseePostal).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      applyDeletions: true,
      dryRun: false,
    });
  });

  it('should apply a small number of deletions without complaining', async () => {
    vi.mocked(loadExistingInseePostal).mockResolvedValue(new Map(postalRows(35_000).entries()) as never);
    vi.mocked(countPendingDeletions).mockReturnValue(12);

    const result = await syncGeoReferentiel();

    expect(result.deletionsSkipped).toBe(false);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should forward the dry-run flag to both writers', async () => {
    await syncGeoReferentiel({ dryRun: true });

    expect(writeCommunes).toHaveBeenCalledWith(expect.anything(), expect.anything(), { dryRun: true });
    expect(writeInseePostal).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      applyDeletions: true,
      dryRun: true,
    });
  });

  it('should warn about communes missing from the source without deleting them', async () => {
    vi.mocked(writeCommunes).mockResolvedValue({ created: 0, updated: 0, deleted: 0, orphans: 3 });

    const result = await syncGeoReferentiel();

    expect(result.orphanCommunes).toBe(3);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ orphanCommunes: 3 }),
      expect.stringContaining('absentes de la source'),
    );
  });

  it('should surface uncovered territoires without failing the run', async () => {
    vi.mocked(buildEntiteCoverageReport).mockResolvedValue({
      territoiresCount: 111,
      missingCdCount: 1,
      missingDdCount: 0,
      missing: [
        { entiteType: 'CD', departementCode: '975', departementLib: 'Saint-Pierre', ctcdCode: '975', ctcdLib: '975' },
      ],
    });

    const result = await syncGeoReferentiel();

    expect(result.coverage.missingCdCount).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ missingCdCount: 1 }),
      expect.stringContaining('sans entité CD ou DDETS'),
    );
  });

  it('should cap the persisted coverage list', async () => {
    vi.mocked(buildEntiteCoverageReport).mockResolvedValue({
      territoiresCount: 111,
      missingCdCount: 80,
      missingDdCount: 0,
      missing: Array.from({ length: 80 }, () => ({
        entiteType: 'CD' as const,
        departementCode: '01',
        departementLib: 'Ain',
        ctcdCode: '01D',
        ctcdLib: 'CD',
      })),
    });

    const result = await syncGeoReferentiel();

    expect(result.coverage.missing).toHaveLength(50);
    expect(result.coverage.missingCdCount).toBe(80);
  });

  it('should propagate a download failure', async () => {
    vi.mocked(parseCommunes).mockRejectedValue(new Error('HTTP 503'));

    await expect(syncGeoReferentiel()).rejects.toThrow('HTTP 503');
    expect(writeCommunes).not.toHaveBeenCalled();
  });
});
