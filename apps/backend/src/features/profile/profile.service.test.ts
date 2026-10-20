import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../libs/prisma.js';
import { acceptCgu } from './profile.service.js';

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}));

describe('profile.service', () => {
  describe('acceptCgu', () => {
    const now = new Date('2026-10-20T08:30:00.000Z');

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(now);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should store the accepted version with the acceptance date and time', async () => {
      const acceptance = { cguAcceptedVersion: '2026-10-20', cguAcceptedAt: now };
      vi.mocked(prisma.user.update).mockResolvedValueOnce(acceptance as never);

      const result = await acceptCgu('user-1', '2026-10-20');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { cguAcceptedVersion: '2026-10-20', cguAcceptedAt: now },
        select: { cguAcceptedVersion: true, cguAcceptedAt: true },
      });
      expect(result).toEqual(acceptance);
    });
  });
});
