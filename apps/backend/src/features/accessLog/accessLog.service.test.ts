import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type AccessLog, prisma } from '../../libs/prisma.js';
import { createAccessLog } from './accessLog.service.js';
import { AccessLogAction, type CreateAccessLogDto } from './accessLog.type.js';

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    accessLog: {
      create: vi.fn(),
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
        requestId: testData.requestId,
        path: testData.path,
        dataKeys: testData.dataKeys,
      },
    });

    expect(result).toEqual(expectedResult);
  });
});
