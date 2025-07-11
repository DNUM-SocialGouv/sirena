import { roles } from '@sirena/common/constants';
import { describe, expect, it, vi } from 'vitest';
import { prisma } from '@/libs/prisma';
import { getRoles } from './roles.service';

vi.mock('@/libs/prisma', () => ({
  prisma: {
    roleEnum: {
      findMany: vi.fn(),
    },
  },
}));

const mockedRoles = vi.mocked(prisma.roleEnum);

describe('role.service.ts', () => {
  it('getRoles - should call findMany', async () => {
    const mockRoles = Object.entries(roles).map(([id, label]) => ({ id, label }));
    mockedRoles.findMany.mockResolvedValueOnce(mockRoles);
    const result = await getRoles();
    expect(mockedRoles.findMany).toHaveBeenCalled();
    expect(result).toEqual(mockRoles);
  });
});
