import { buffer, text } from 'node:stream/consumers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prepareExportRequetesCsv } from './exportRequetes.service.js';
import { generateExportRequetesDocument, getExportRequetesFileName } from './exportRequetesDocument.js';

vi.mock('./exportRequetes.service.js', () => ({
  prepareExportRequetesCsv: vi.fn(),
}));

const params = { topEntiteId: 'root-entite', startDate: '2026-09-26', endDate: '2026-10-26' };

describe('generateExportRequetesDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('names the file after the period', () => {
    expect(getExportRequetesFileName(params)).toBe('export-requetes-sirena_2026-09-26_2026-10-26.csv');
  });

  it('streams the whole CSV and reports its rows and UTF-8 size once consumed', async () => {
    vi.mocked(prepareExportRequetesCsv).mockResolvedValueOnce(async (write) => {
      await write('\uFEFFNuméro de requête');
      await write('\nREQ-1\nREQ-2');
      return 2;
    });

    const document = await generateExportRequetesDocument(params);
    const bytes = await buffer(document.stream);

    expect(prepareExportRequetesCsv).toHaveBeenCalledWith(params);
    expect(document.mimeType).toBe('text/csv');
    // CA9: the stored bytes start with the UTF-8 BOM (decoders such as TextDecoder hide it).
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(bytes.subarray(3).toString('utf8')).toBe('Numéro de requête\nREQ-1\nREQ-2');
    expect(document.getStats()).toEqual({ rowCount: 2, size: bytes.length });
  });

  it('errors the stream when the generation fails midway, so no truncated file is stored', async () => {
    vi.mocked(prepareExportRequetesCsv).mockResolvedValueOnce(async (write) => {
      await write('\uFEFFNuméro de requête');
      throw new Error('page read failed');
    });

    const document = await generateExportRequetesDocument(params);

    await expect(text(document.stream)).rejects.toThrow('page read failed');
  });
});
