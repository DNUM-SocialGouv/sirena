import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@/libs/prisma';
import { convertDatesToStrings } from '@/tests/formatter';
import DematSocialMappingController from './dematSocialMapping.controller';
import {
  getDematSocialMappingById,
  getDematSocialMappings,
  patchDematSocialMapping,
} from './dematSocialMapping.service';

vi.mock('@/config/env', () => ({ envVars: {} }));

vi.mock('./dematSocialMapping.service', () => ({
  getDematSocialMappingById: vi.fn(),
  getDematSocialMappings: vi.fn(),
  patchDematSocialMapping: vi.fn(),
}));

vi.mock('@/middlewares/auth.middleware', () => {
  return {
    default: async (c: Context, next: Next) => {
      c.set('userId', 'id1');
      return next();
    },
  };
});

vi.mock('@/middlewares/role.middleware', () => {
  return {
    default: () => {
      return (_c: Context, next: Next) => {
        return next();
      };
    },
  };
});

describe('DematSocialMapping endpoints', () => {
  const client = testClient(DematSocialMappingController);
  const mockMapping = {
    id: '1',
    key: 'abc',
    dematSocialId: 'ds1',
    label: 'Label A',
    comment: 'comment',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('GET /', () => {
    it('should return paginated mappings', async () => {
      vi.mocked(getDematSocialMappings).mockResolvedValueOnce({ data: [mockMapping], total: 1 });

      const res = await client.index.$get({ query: { offset: '0', limit: '10', sort: 'key', order: 'asc' } });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: [convertDatesToStrings(mockMapping)],
        meta: { offset: 0, limit: 10, total: 1 },
      });
    });
  });

  describe('GET /:id', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should return a mapping by ID', async () => {
      vi.mocked(getDematSocialMappingById).mockResolvedValueOnce(mockMapping);
      const res = await client[':id'].$get({ param: { id: '1' } });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: convertDatesToStrings(mockMapping) });
    });

    it('should return 404 if not found', async () => {
      vi.mocked(getDematSocialMappingById).mockResolvedValueOnce(null);
      const res = await client[':id'].$get({ param: { id: '999' } });
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /:id', () => {
    const updateData = { label: 'updated', comment: 'updated comment', dematSocialId: 'ds2' };

    it('should update a mapping', async () => {
      vi.mocked(patchDematSocialMapping).mockResolvedValueOnce({ ...mockMapping, ...updateData });

      const res = await client[':id'].$patch({ param: { id: '1' }, json: updateData });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: convertDatesToStrings({ ...mockMapping, ...updateData }) });
    });

    it('should return 404 if mapping not found during patch', async () => {
      const err = new Prisma.PrismaClientKnownRequestError('record not found', {
        code: 'P2025',
        clientVersion: '4.0.0',
      });
      vi.mocked(patchDematSocialMapping).mockRejectedValueOnce(err);

      const res = await client[':id'].$patch({ param: { id: '999' }, json: updateData });
      expect(res.status).toBe(404);
    });
  });
});
