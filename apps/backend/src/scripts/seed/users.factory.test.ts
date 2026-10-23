import { CGU_VERSION } from '@sirena/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../libs/prisma.js';
import type { ArsEntites } from './entites.js';
import { seedUsers } from './users.factory.js';

vi.mock('../../libs/prisma.js', () => ({
  prisma: { user: { upsert: vi.fn() } },
}));

const entites: ArsEntites = {
  normandie: { id: 'ars-normandie', nomComplet: 'ARS Normandie', regLib: 'Normandie' },
  idf: { id: 'ars-idf', nomComplet: 'ARS Île-de-France', regLib: 'Île-de-France' },
};
const email = 'user@yopmail.com';
const fixedId = 'fixed-user-id';

beforeEach(() => {
  vi.mocked(prisma.user.upsert).mockReset();
});

describe('fixed user ids', () => {
  it('stops the seed when an existing user has a different id', async () => {
    vi.mocked(prisma.user.upsert).mockResolvedValue({ id: 'existing-user-id' } as never);

    await expect(seedUsers(entites, [], { [email]: fixedId })).rejects.toThrow(
      `Identifiant fixe non respecté pour ${email} : attendu "${fixedId}", trouvé "existing-user-id".`,
    );
    expect(prisma.user.upsert).toHaveBeenCalledTimes(1);
    expect(vi.mocked(prisma.user.upsert).mock.calls[0][0].update).not.toHaveProperty('id');
  });

  it('accepts an existing user with the expected id without reassigning its primary key', async () => {
    vi.mocked(prisma.user.upsert).mockResolvedValue({ id: fixedId } as never);

    const users = await seedUsers(entites, [], { [email]: fixedId });

    expect(users).toHaveLength(8);
    expect(users[0].email).toBe(email);
    expect(vi.mocked(prisma.user.upsert).mock.calls[0][0].update).not.toHaveProperty('id');
  });

  it('accepts existing ids when no fixed id is requested', async () => {
    vi.mocked(prisma.user.upsert).mockResolvedValue({ id: 'existing-user-id' } as never);

    await expect(seedUsers(entites, [])).resolves.toHaveLength(8);
  });
});

describe('CGU acceptance', () => {
  it('seeds users who already accepted the CGU in force', async () => {
    vi.mocked(prisma.user.upsert).mockResolvedValue({ id: 'existing-user-id' } as never);

    await seedUsers(entites, []);

    for (const [args] of vi.mocked(prisma.user.upsert).mock.calls) {
      for (const data of [args.create, args.update]) {
        expect(data).toMatchObject({ cguAcceptedVersion: CGU_VERSION, cguAcceptedAt: expect.any(Date) });
      }
    }
  });
});
