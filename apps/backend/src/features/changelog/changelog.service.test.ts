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
