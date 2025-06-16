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

vi.mock('@/middlewares/auth.middleware', () => {
  return {
    default: (c: Context, next: () => Promise<Next>) => {
      return next();
    },
  };
});

describe('User Endpoint', () => {
  const client = testClient(app);

  const fakeData = [
    {
      id: 'id1',
      email: 'user1@example.com',
      firstName: 'John',
      lastName: 'Doe',
      sub: 'sub1',
      uid: 'uid1',
      createdAt: new Date(0),
      roleId: 'role1',
      active: true,
      pcData: {},
    },
    {
      id: 'id2',
      email: 'user2@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      sub: 'sub2',
      uid: 'uid2',
      createdAt: new Date(0),
      roleId: 'role2',
      active: false,
      pcData: {},
    },
  ];

  it('GET / Should return a list of users without filters', async () => {
    vi.mocked(getUsers).mockResolvedValue(fakeData);

    const res = await client.index.$get({ query: {} });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ data: convertDatesToStrings(fakeData) });
    expect(getUsers).toHaveBeenCalledWith({ roleId: undefined, active: undefined });
  });

  it('GET / Should filter users by roleId', async () => {
    const filteredData = [fakeData[0]];
    vi.mocked(getUsers).mockResolvedValue(filteredData);

    const res = await client.index.$get({ query: { roleId: 'role1' } });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ data: convertDatesToStrings(filteredData) });
    expect(getUsers).toHaveBeenCalledWith({ roleId: 'role1', active: undefined });
  });

  it('GET / Should filter users by active status (true)', async () => {
    const filteredData = [fakeData[0]];
    vi.mocked(getUsers).mockResolvedValue(filteredData);

    const res = await client.index.$get({ query: { active: 'true' } });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ data: convertDatesToStrings(filteredData) });
    expect(getUsers).toHaveBeenCalledWith({ roleId: undefined, active: true });
  });

  it('GET / Should filter users by active status (false)', async () => {
    const filteredData = [fakeData[1]];
    vi.mocked(getUsers).mockResolvedValue(filteredData);

    const res = await client.index.$get({ query: { active: 'false' } });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ data: convertDatesToStrings(filteredData) });
    expect(getUsers).toHaveBeenCalledWith({ roleId: undefined, active: false });
  });

  it('GET / Should filter users by both roleId and active status', async () => {
    const filteredData = [fakeData[0]];
    vi.mocked(getUsers).mockResolvedValue(filteredData);

    const res = await client.index.$get({
      query: {
        roleId: 'role1',
        active: 'true',
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ data: convertDatesToStrings(filteredData) });
    expect(getUsers).toHaveBeenCalledWith({ roleId: 'role1', active: true });
  });

  it('GET / Should return empty array when no users match filters', async () => {
    vi.mocked(getUsers).mockResolvedValue([]);

    const res = await client.index.$get({
      query: {
        roleId: 'nonexistent-role',
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ data: [] });
    expect(getUsers).toHaveBeenCalledWith({ roleId: 'nonexistent-role', active: undefined });
  });
});
