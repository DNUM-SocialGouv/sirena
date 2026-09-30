import { ROLES } from '@sirena/common/constants';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../libs/prisma.js';
import type { ArsEntites } from './entites.js';
import { buildE2eSeedConfig, E2E_ENTITY_ADMIN_ID } from './profiles.js';
import { seedUsers } from './users.factory.js';

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    user: { upsert: vi.fn(async ({ create }) => ({ id: create.id ?? 'generated-id' })) },
    entite: { findFirst: vi.fn() },
  },
}));

const entites: ArsEntites = {
  normandie: { id: 'ars-normandie', nomComplet: 'ARS Normandie', regLib: 'Normandie' },
  idf: { id: 'ars-idf', nomComplet: 'ARS Île-de-France', regLib: 'Île-de-France' },
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('e2e user configuration', () => {
  it.each([undefined, 'user19@yopmail.com'])('seeds the default account once when email is %s', async (email) => {
    vi.stubEnv('E2E_ENTITY_ADMIN_USER_1_EMAIL', email);
    const config = buildE2eSeedConfig();

    expect(config.customUsers).toEqual([]);
    await seedUsers(entites, config.customUsers, config.fixedUserIds);

    const calls = vi
      .mocked(prisma.user.upsert)
      .mock.calls.filter(([args]) => args.where.email === 'user19@yopmail.com');
    expect(calls).toHaveLength(1);
    expect(calls[0][0].create).toMatchObject({
      id: E2E_ENTITY_ADMIN_ID,
      roleId: ROLES.ENTITY_ADMIN,
      entiteId: entites.idf.id,
    });
  });

  it('creates the configured account on ARS Île-de-France with the fixed id', async () => {
    const email = 'e2e@example.com';
    vi.stubEnv('E2E_ENTITY_ADMIN_USER_1_EMAIL', email);
    vi.mocked(prisma.entite.findFirst).mockResolvedValue(entites.idf as never);
    const config = buildE2eSeedConfig();

    await seedUsers(entites, config.customUsers, config.fixedUserIds);

    expect(prisma.entite.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { entiteTypeId: 'ARS', regLib: 'Île-de-France', entiteMereId: null } }),
    );
    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email },
        create: expect.objectContaining({
          email,
          id: E2E_ENTITY_ADMIN_ID,
          roleId: ROLES.ENTITY_ADMIN,
          entiteId: entites.idf.id,
        }),
      }),
    );
    const defaultCall = vi
      .mocked(prisma.user.upsert)
      .mock.calls.find(([args]) => args.where.email === 'user19@yopmail.com');
    expect(defaultCall).toBeDefined();
    expect(defaultCall?.[0].create).not.toHaveProperty('id');
  });
});
