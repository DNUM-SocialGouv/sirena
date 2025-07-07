import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntitesController from './entites.controller';
import { getEntiteChain, getEntites } from './entites.service';

vi.mock('@/config/env', () => ({
  envVars: {},
}));

vi.mock('./entites.service', () => ({
  getEntiteChain: vi.fn(),
  getEntites: vi.fn(),
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

describe('Entites endpoints: /entites', () => {
  const client = testClient(EntitesController);

  const mockEntite = {
    id: '2',
    label: 'b',
    email: 'test2@domain.fr',
    entiteTypeId: 'ENTITE_TYPE_A',
    entiteMereId: null,
    nomComplet: 'Entite B',
    organizationUnit: 'ARS-CORSE',
    emailDomain: null,
  };

  describe('GET /:id?', () => {
    it('should return entities from root when id is not provided', async () => {
      vi.mocked(getEntites).mockResolvedValueOnce({
        data: [mockEntite],
        total: 1,
      });

      const res = await client[':id?'].$get({ param: { id: undefined }, query: { offset: '0', limit: '10' } });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: [mockEntite],
        meta: {
          offset: 0,
          limit: 10,
          total: 1,
        },
      });

      expect(getEntites).toHaveBeenCalledWith(null, {
        offset: 0,
        limit: 10,
      });
    });

    it('should return entities for given parent id', async () => {
      vi.mocked(getEntites).mockResolvedValueOnce({
        data: [mockEntite],
        total: 1,
      });

      const res = await client[':id?'].$get({ param: { id: '1' }, query: { offset: '0', limit: '5' } });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: [mockEntite],
        meta: {
          offset: 0,
          limit: 5,
          total: 1,
        },
      });

      expect(getEntites).toHaveBeenCalledWith('1', {
        offset: 0,
        limit: 5,
      });
    });
  });

  describe('GET /chain/:id?', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return the entity chain for given ID', async () => {
      const mockData = [
        { id: '1', nomComplet: 'Root' },
        { id: '2', nomComplet: 'Child' },
      ];

      vi.mocked(getEntiteChain).mockResolvedValueOnce(mockData);

      const res = await client.chain[':id?'].$get({ param: { id: '1' } });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: mockData });
      expect(getEntiteChain).toHaveBeenCalledWith('1');
    });

    it('should return empty array if no ID is provided', async () => {
      const res = await client.chain[':id?'].$get({ param: { id: undefined } });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: [] });
      expect(getEntiteChain).not.toHaveBeenCalled();
    });
  });
});
