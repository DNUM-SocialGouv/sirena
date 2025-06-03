import { convertDatesToStrings } from '@/tests/formatter';
import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { describe, expect, it, vi } from 'vitest';
import app from './users.controller';
import { getUsers } from './users.service';

vi.mock('./users.service', () => ({
  getUsers: vi.fn(),
}));

vi.mock('@/config/env', () => ({
  envVars: {},
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

describe('User Endpoint', () => {
  const client = testClient(app);

  it('GET / Should return a list of users', async () => {
    const fakeData = [
      {
        id: 'id',
        email: 'email',
        firstName: 'firstName',
        lastName: 'lastName',
        sub: 'sub',
        uid: 'uid',
        createdAt: new Date(0),
      },
    ];

    vi.mocked(getUsers).mockResolvedValue(fakeData);

    const res = await client.index.$get();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ data: convertDatesToStrings(fakeData) });
  });
});
