import { convertDatesToStrings } from '@/tests/formatter.ts';
import { testClient } from 'hono/testing';
import { describe, expect, it, vi } from 'vitest';
import app from './users.controller.ts';
import { getUsers } from './users.service.ts';

vi.mock('./users.service.ts', () => ({
  getUsers: vi.fn(),
}));

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
