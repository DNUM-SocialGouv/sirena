import { beforeEach, describe, expect, it, vi } from 'vitest';
import { connection } from '../../../config/redis.js';
import { addDocumentExportJob } from '../../../jobs/queues/documentExport.queue.js';
import { prisma } from '../../../libs/prisma.js';
import { createAccessLog } from '../../accessLog/accessLog.service.js';
import {
  createDocumentExport,
  findActiveDocumentExport,
  markDocumentExportFailed,
} from '../../documentExports/documentExports.service.js';
import { countExportRequetes } from './exportRequetes.service.js';
import { EXPORT_REQUETES_COLUMNS } from './exportRequetesColumns.js';
import { type RequestExportRequetesInput, requestExportRequetes } from './requestExportRequetes.service.js';

const tx = vi.hoisted(() => ({ marker: 'transaction-client' }));

vi.mock('../../../config/redis.js', () => ({
  connection: { set: vi.fn(), get: vi.fn(), del: vi.fn() },
}));

vi.mock('../../../jobs/queues/documentExport.queue.js', () => ({
  addDocumentExportJob: vi.fn(),
}));

vi.mock('../../../libs/prisma.js', () => ({
  prisma: { $transaction: vi.fn((callback: (client: unknown) => unknown) => callback(tx)) },
}));

vi.mock('../../accessLog/accessLog.service.js', () => ({
  createAccessLog: vi.fn(),
}));

vi.mock('../../documentExports/documentExports.service.js', () => ({
  DOCUMENT_EXPORT_TYPE: { REQUETES_CSV: 'REQUETES_CSV' },
  createDocumentExport: vi.fn(),
  findActiveDocumentExport: vi.fn(),
  markDocumentExportFailed: vi.fn(),
}));

vi.mock('./exportRequetes.service.js', () => ({
  countExportRequetes: vi.fn(),
}));

const input: RequestExportRequetesInput = {
  userId: 'user-1',
  topEntiteId: 'root-entite',
  startDate: '2026-09-26',
  endDate: '2026-10-26',
  path: '/api/statistics/requetes-export',
  requestId: 'request-1',
};

describe('requestExportRequetes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(connection.set).mockResolvedValue('OK');
    // Echo the token the service stored, as Redis would.
    vi.mocked(connection.get).mockImplementation(
      async () => vi.mocked(connection.set).mock.calls.at(-1)?.[1] as string,
    );
    vi.mocked(connection.del).mockResolvedValue(1);
    vi.mocked(findActiveDocumentExport).mockResolvedValue(null);
    vi.mocked(countExportRequetes).mockResolvedValue(12);
    vi.mocked(createDocumentExport).mockResolvedValue({ id: 'export-1' } as Awaited<
      ReturnType<typeof createDocumentExport>
    >);
  });

  it('creates the export and its AccessLog trace in one transaction, then queues the generation', async () => {
    const result = await requestExportRequetes(input);

    expect(result).toEqual({ ok: true, documentExportId: 'export-1' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(createDocumentExport).toHaveBeenCalledWith(
      {
        type: 'REQUETES_CSV',
        userId: 'user-1',
        topEntiteId: 'root-entite',
        params: { startDate: '2026-09-26', endDate: '2026-10-26' },
      },
      tx,
    );
    // CA18: what (action + period), who, and the export it refers to.
    expect(createAccessLog).toHaveBeenCalledWith(
      {
        entity: 'DocumentExport',
        entityId: 'export-1',
        action: 'EXPORT_REQUETES_CSV',
        userId: 'user-1',
        topEntiteId: 'root-entite',
        requestId: 'request-1',
        path: '/api/statistics/requetes-export',
        dataKeys: EXPORT_REQUETES_COLUMNS.map((column) => column.key),
        params: { startDate: '2026-09-26', endDate: '2026-10-26' },
      },
      tx,
    );
    expect(addDocumentExportJob).toHaveBeenCalledWith('export-1');
    expect(connection.del).toHaveBeenCalledWith('document-export:create:user-1');
  });

  it('refuses a second export while the creation lock is held', async () => {
    vi.mocked(connection.set).mockResolvedValueOnce(null as never);

    const result = await requestExportRequetes(input);

    expect(result).toEqual({ ok: false, code: 'EXPORT_IN_PROGRESS' });
    expect(createDocumentExport).not.toHaveBeenCalled();
    expect(connection.del).not.toHaveBeenCalled();
  });

  it('refuses a new export while one is still being generated for the user', async () => {
    vi.mocked(findActiveDocumentExport).mockResolvedValueOnce({ id: 'export-0' });

    const result = await requestExportRequetes(input);

    expect(result).toEqual({ ok: false, code: 'EXPORT_IN_PROGRESS' });
    expect(findActiveDocumentExport).toHaveBeenCalledWith('user-1', 'REQUETES_CSV');
    expect(createDocumentExport).not.toHaveBeenCalled();
    expect(connection.del).toHaveBeenCalledWith('document-export:create:user-1');
  });

  it('launches nothing, and traces nothing, when no requête matches the period', async () => {
    vi.mocked(countExportRequetes).mockResolvedValueOnce(0);

    const result = await requestExportRequetes(input);

    expect(result).toEqual({ ok: false, code: 'NO_REQUETE' });
    expect(countExportRequetes).toHaveBeenCalledWith({
      topEntiteId: 'root-entite',
      startDate: '2026-09-26',
      endDate: '2026-10-26',
    });
    expect(createDocumentExport).not.toHaveBeenCalled();
    expect(createAccessLog).not.toHaveBeenCalled();
  });

  it('does not release a lock that expired and was taken by another request', async () => {
    vi.mocked(connection.get).mockResolvedValueOnce('another-token');

    await requestExportRequetes(input);

    expect(connection.del).not.toHaveBeenCalled();
  });

  it('marks the export failed when the job cannot be queued, so it does not block the user', async () => {
    const error = new Error('Redis down');
    vi.mocked(addDocumentExportJob).mockRejectedValueOnce(error);

    await expect(requestExportRequetes(input)).rejects.toThrow(error);
    expect(markDocumentExportFailed).toHaveBeenCalledWith('export-1', 'The generation job could not be queued');
    expect(connection.del).toHaveBeenCalledWith('document-export:create:user-1');
  });
});
