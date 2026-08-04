import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type AccessLog, prisma } from '../../libs/prisma.js';
import {
  countAccessLogs,
  countAccessLogsOlderThan,
  createAccessLog,
  deleteAccessLogsOlderThan,
  getOldestAccessLogDate,
} from './accessLog.service.js';
import { AccessLogAction, type CreateAccessLogDto } from './accessLog.type.js';

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    accessLog: {
      create: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

const mockedAccessLog = vi.mocked(prisma.accessLog);

describe('AccessLog Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create an access log entry', async () => {
    const testData: CreateAccessLogDto = {
      entity: 'Requete',
      entityId: 'requete-123',
      action: AccessLogAction.EXPORT_ENTITY_PDF,
      userId: 'user-456',
      topEntiteId: 'entite-123',
      requestId: 'request-789',
      path: '/requetes-entite/:id/export-pdf',
      dataKeys: ['requete.declarant.identite.nom', 'requete.declarant.identite.prenom'],
    };

    const expectedResult: AccessLog = {
      id: 'accesslog-123',
      createdAt: new Date(),
      ...testData,
    };

    mockedAccessLog.create.mockResolvedValue(expectedResult);

    const result = await createAccessLog(testData);

    expect(mockedAccessLog.create).toHaveBeenCalledWith({
      data: {
        entity: testData.entity,
        entityId: testData.entityId,
        action: testData.action,
        userId: testData.userId,
        topEntiteId: testData.topEntiteId,
        requestId: testData.requestId,
        path: testData.path,
        dataKeys: testData.dataKeys,
      },
    });

    expect(result).toEqual(expectedResult);
  });

  it('should count all access logs', async () => {
    mockedAccessLog.count.mockResolvedValue(120);

    await expect(countAccessLogs()).resolves.toBe(120);
    expect(mockedAccessLog.count).toHaveBeenCalledWith();
  });

  it('should count access logs older than the cutoff', async () => {
    const cutoff = new Date('2026-01-01T00:00:00.000Z');
    mockedAccessLog.count.mockResolvedValue(7);

    await expect(countAccessLogsOlderThan(cutoff)).resolves.toBe(7);
    expect(mockedAccessLog.count).toHaveBeenCalledWith({ where: { createdAt: { lt: cutoff } } });
  });

  it('should delete access logs older than the cutoff and return the count', async () => {
    const cutoff = new Date('2026-01-01T00:00:00.000Z');
    mockedAccessLog.deleteMany.mockResolvedValue({ count: 42 });

    await expect(deleteAccessLogsOlderThan(cutoff)).resolves.toBe(42);
    expect(mockedAccessLog.deleteMany).toHaveBeenCalledWith({ where: { createdAt: { lt: cutoff } } });
  });

  it('should return the creation date of the oldest access log', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    mockedAccessLog.findFirst.mockResolvedValue({ createdAt } as AccessLog);

    await expect(getOldestAccessLogDate()).resolves.toEqual(createdAt);
    expect(mockedAccessLog.findFirst).toHaveBeenCalledWith({
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });
  });

  it('should return null when there is no access log', async () => {
    mockedAccessLog.findFirst.mockResolvedValue(null);

    await expect(getOldestAccessLogDate()).resolves.toBeNull();
  });
});
