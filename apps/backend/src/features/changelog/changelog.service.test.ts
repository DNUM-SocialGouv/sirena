import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type ChangeLog, prisma } from '../../libs/prisma.js';
import { createChangeLog } from './changelog.service.js';
import { ChangeLogAction, type CreateChangeLogDto } from './changelog.type.js';

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    changeLog: {
      create: vi.fn(),
    },
  },
}));

const mockedChangeLog = vi.mocked(prisma.changeLog);

describe('ChangeLog Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the transaction client when provided', async () => {
    const testData: CreateChangeLogDto = {
      entity: 'RequeteEtape',
      entityId: 'step-123',
      action: ChangeLogAction.CREATED,
      before: null,
      after: { type: 'ASSIGNMENT' },
      changedById: 'user-123',
    };
    const transactionCreate = vi.fn().mockResolvedValue({ id: 'changelog-123', changedAt: new Date(), ...testData });
    const tx = { changeLog: { create: transactionCreate } } as unknown as NonNullable<
      Parameters<typeof createChangeLog>[1]
    >;

    await createChangeLog(testData, tx);

    expect(transactionCreate).toHaveBeenCalledWith({
      data: {
        entity: testData.entity,
        entityId: testData.entityId,
        action: testData.action,
        before: testData.before,
        after: testData.after,
        changedById: testData.changedById,
      },
    });
    expect(mockedChangeLog.create).not.toHaveBeenCalled();
  });

  it('should create a changelog entry', async () => {
    const testData: CreateChangeLogDto = {
      entity: 'User',
      entityId: 'user-123',
      action: ChangeLogAction.CREATED,
      before: { name: 'John Doe', email: 'john@example.com' },
      after: { name: 'John Doe', email: 'john@example.com' },
      changedById: 'admin-456',
    };

    const expectedResult: ChangeLog = {
      id: 'changelog-789',
      changedAt: new Date(),
      ...testData,
    };

    mockedChangeLog.create.mockResolvedValue(expectedResult);

    const result = await createChangeLog(testData);

    expect(mockedChangeLog.create).toHaveBeenCalledWith({
      data: {
        entity: testData.entity,
        entityId: testData.entityId,
        action: testData.action,
        before: testData.before,
        after: testData.after,
        changedById: testData.changedById,
      },
    });

    expect(result).toEqual(expectedResult);
  });
});
