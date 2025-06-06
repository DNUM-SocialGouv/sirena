import { Role } from '@/libs/prisma';
import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { describe, expect, it, vi } from 'vitest';
import app from './roles.controller';
import { getRoles } from './roles.service';

vi.mock('./roles.service', () => ({
  getRoles: vi.fn(),
}));

vi.mock('@/config/env', () => ({
  envVars: {},
}));

vi.mock('@/middlewares/auth.middleware', () => {
  return {
    default: (c: Context, next: () => Promise<Next>) => {
      return next();
    },
  };
});

describe('Roles Endpoint', () => {
  const client = testClient(app);

  it('GET / Should return a list of Roles', async () => {
    const fakeData = [
      {
        id: 'cmbi355wi0000qcaf39i0gylp',
        roleName: 'PENDING',
        description: "En attente d'affectation (rôle technique)",
      },
    ];

    vi.mocked(getRoles).mockResolvedValue(fakeData);

    const res = await client.index.$get();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ data: fakeData });
  });
});
