import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../libs/prisma.js';
import {
  createDocumentExport,
  deleteDocumentExportsOlderThan,
  failStaleDocumentExports,
  findActiveDocumentExport,
  findExpiredDocumentExportFiles,
  markDocumentExportFailed,
  markDocumentExportProcessing,
  markDocumentExportReady,
  markDocumentExportsExpired,
} from './documentExports.service.js';

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    documentExport: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe('documentExports.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('looks for an export of the user still pending or processing, started less than 30 minutes ago', async () => {
    await findActiveDocumentExport('user-1', 'REQUETES_CSV', new Date('2026-10-26T10:00:00.000Z'));

    expect(prisma.documentExport.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        type: 'REQUETES_CSV',
        status: { in: ['PENDING', 'PROCESSING'] },
        createdAt: { gt: new Date('2026-10-26T09:30:00.000Z') },
      },
      select: { id: true },
    });
  });

  it('creates a pending export linked to its requester', async () => {
    await createDocumentExport({
      type: 'REQUETES_CSV',
      userId: 'user-1',
      topEntiteId: 'root-entite',
      params: { startDate: '2026-09-26', endDate: '2026-10-26' },
    });

    expect(prisma.documentExport.create).toHaveBeenCalledWith({
      data: {
        type: 'REQUETES_CSV',
        params: { startDate: '2026-09-26', endDate: '2026-10-26' },
        topEntiteId: 'root-entite',
        user: { connect: { id: 'user-1' } },
      },
    });
  });

  it('stores the file and makes the link expire 30 minutes after the generation', async () => {
    await markDocumentExportReady('export-1', {
      fileName: 'export.csv',
      filePath: 'exports/abc.csv',
      mimeType: 'text/csv',
      size: 1024,
      rowCount: 42,
      encryption: { iv: 'iv', authTag: 'tag' },
      generatedAt: new Date('2026-10-26T10:00:00.000Z'),
    });

    expect(prisma.documentExport.update).toHaveBeenCalledWith({
      where: { id: 'export-1' },
      data: expect.objectContaining({
        status: 'READY',
        filePath: 'exports/abc.csv',
        metadata: { encryption: { iv: 'iv', authTag: 'tag' } },
        generatedAt: new Date('2026-10-26T10:00:00.000Z'),
        expiresAt: new Date('2026-10-26T10:30:00.000Z'),
      }),
    });
  });

  it('records why an export failed, only while it is still pending or processing', async () => {
    vi.mocked(prisma.documentExport.updateMany).mockResolvedValueOnce({ count: 1 });

    await expect(markDocumentExportFailed('export-1', 'boom')).resolves.toBe(true);

    expect(prisma.documentExport.updateMany).toHaveBeenCalledWith({
      where: { id: 'export-1', status: { in: ['PENDING', 'PROCESSING'] } },
      data: { status: 'FAILED', error: 'boom' },
    });
  });

  it('leaves an export settled meanwhile untouched when a late failure arrives', async () => {
    vi.mocked(prisma.documentExport.updateMany).mockResolvedValueOnce({ count: 0 });

    await expect(markDocumentExportFailed('export-1', 'boom')).resolves.toBe(false);
  });

  it('starts the generation only of an export still pending or processing', async () => {
    vi.mocked(prisma.documentExport.updateMany).mockResolvedValueOnce({ count: 0 });

    await expect(markDocumentExportProcessing('export-1')).resolves.toBe(false);

    expect(prisma.documentExport.updateMany).toHaveBeenCalledWith({
      where: { id: 'export-1', status: { in: ['PENDING', 'PROCESSING'] } },
      data: { status: 'PROCESSING', error: null },
    });
  });

  it('fails the exports still pending or processing 30 minutes after they were asked for', async () => {
    vi.mocked(prisma.documentExport.updateMany).mockResolvedValueOnce({ count: 2 });

    await expect(failStaleDocumentExports(new Date('2026-10-26T10:00:00.000Z'))).resolves.toBe(2);

    expect(prisma.documentExport.updateMany).toHaveBeenCalledWith({
      where: { status: { in: ['PENDING', 'PROCESSING'] }, createdAt: { lte: new Date('2026-10-26T09:30:00.000Z') } },
      data: { status: 'FAILED', error: 'The generation did not finish in time' },
    });
  });

  it('deletes only the settled exports older than the retention cutoff', async () => {
    vi.mocked(prisma.documentExport.deleteMany).mockResolvedValueOnce({ count: 3 });

    await expect(deleteDocumentExportsOlderThan(new Date('2025-10-26T00:00:00.000Z'))).resolves.toBe(3);

    expect(prisma.documentExport.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: new Date('2025-10-26T00:00:00.000Z') }, status: { in: ['EXPIRED', 'FAILED'] } },
    });
  });

  it('lists the exports whose link has expired while their file is still stored, oldest first', async () => {
    vi.mocked(prisma.documentExport.findMany).mockResolvedValueOnce([
      { id: 'export-1', filePath: 'exports/abc.csv' },
    ] as never);

    const expired = await findExpiredDocumentExportFiles(new Date('2026-10-26T10:00:00.000Z'), 500);

    expect(prisma.documentExport.findMany).toHaveBeenCalledWith({
      where: { filePath: { not: null }, expiresAt: { lte: new Date('2026-10-26T10:00:00.000Z') } },
      select: { id: true, filePath: true },
      orderBy: { expiresAt: 'asc' },
      take: 500,
    });
    expect(expired).toEqual([{ id: 'export-1', filePath: 'exports/abc.csv' }]);
  });

  it('marks the purged exports expired and forgets their file, keeping the row as a trace', async () => {
    vi.mocked(prisma.documentExport.updateMany).mockResolvedValueOnce({ count: 2 });

    await expect(markDocumentExportsExpired(['export-1', 'export-2'])).resolves.toBe(2);

    expect(prisma.documentExport.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['export-1', 'export-2'] } },
      data: { status: 'EXPIRED', filePath: null },
    });
  });

  it('does not query the database when there is no export to mark expired', async () => {
    await expect(markDocumentExportsExpired([])).resolves.toBe(0);

    expect(prisma.documentExport.updateMany).not.toHaveBeenCalled();
  });
});
