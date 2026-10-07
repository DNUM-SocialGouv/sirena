import type { PrismaClient } from '@sirena/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';
import { prisma } from '../../libs/__mocks__/prisma.js';
import type { Prisma } from '../../libs/prisma.js';
import { createDefaultRequeteEtapes } from '../requeteEtapes/requetesEtapes.service.js';
import { generateRequeteId } from '../requetes/functionalId.service.js';
import { createRequeteEntite } from './requetesEntite.service.js';

vi.mock('../../libs/prisma.js');
vi.mock('../../libs/minio.js', () => ({
  deleteFileFromMinio: vi.fn(),
  getFileStream: vi.fn(),
}));
vi.mock('../../helpers/sse.js', () => ({
  sseEventManager: { emitRequeteUpdated: vi.fn() },
}));
vi.mock('../requetes/functionalId.service.js', () => ({
  generateRequeteId: vi.fn(),
}));
vi.mock('../requeteEtapes/requetesEtapes.service.js', () => ({
  createDefaultRequeteEtapes: vi.fn(),
}));

const entiteId = 'entite-1';
const userId = 'user-1';
const createdRequete = {
  id: '2026-10-RS1',
  requeteEntites: [{ requeteId: '2026-10-RS1', entiteId }],
  declarant: { id: 'declarant-1' },
};

// Shape raised by Prisma 7 with the pg driver adapter (captured on a local database).
const p2002 = (constraint: { index?: string; fields?: string[] }, table = 'Requete') =>
  Object.assign(new Error('Unique constraint failed'), {
    code: 'P2002',
    meta: {
      modelName: 'Requete',
      driverAdapterError: {
        cause: { originalCode: '23505', kind: 'UniqueConstraintViolation', constraint, table },
      },
    },
  });

const p2002OnId = p2002({ index: 'Requete_pkey' });

describe('createRequeteEntite', () => {
  let tx: ReturnType<typeof mockDeep<PrismaClient>>;

  beforeEach(() => {
    vi.clearAllMocks();
    tx = mockDeep<PrismaClient>();
    tx.requete.create.mockResolvedValue(createdRequete as never);
    prisma.$transaction.mockImplementation((async (cb: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
      cb(tx as unknown as Prisma.TransactionClient)) as never);
    vi.mocked(generateRequeteId).mockResolvedValue('2026-10-RS1');
    vi.mocked(createDefaultRequeteEtapes).mockResolvedValue(null);
  });

  it('runs every write inside a single transaction', async () => {
    const result = await createRequeteEntite(entiteId, { declarant: { estPersonneConcernee: true } as never }, userId);

    expect(result).toBe(createdRequete);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(generateRequeteId).toHaveBeenCalledWith('SIRENA', tx);
    expect(tx.requete.create).toHaveBeenCalledTimes(1);
    expect(createDefaultRequeteEtapes).toHaveBeenCalledWith(createdRequete.id, entiteId, tx, userId, {
      transactionalAudit: true,
    });
    expect(tx.personneConcernee.update).toHaveBeenCalledWith({
      where: { id: 'declarant-1' },
      data: { participantDeId: createdRequete.id },
    });
    expect(prisma.requete.create).not.toHaveBeenCalled();
    expect(prisma.personneConcernee.update).not.toHaveBeenCalled();
  });

  it('propagates a failure of createDefaultRequeteEtapes out of the transaction so nothing is committed', async () => {
    const failure = new Error('etapes failure');
    vi.mocked(createDefaultRequeteEtapes).mockRejectedValueOnce(failure);

    await expect(
      createRequeteEntite(entiteId, { declarant: { estPersonneConcernee: true } as never }, userId),
    ).rejects.toBe(failure);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.requete.create).toHaveBeenCalledTimes(1);
    expect(tx.personneConcernee.update).not.toHaveBeenCalled();
    expect(prisma.requete.create).not.toHaveBeenCalled();
  });

  it('retries with a fresh transaction and a new id on a P2002 collision on id', async () => {
    vi.mocked(generateRequeteId).mockResolvedValueOnce('2026-10-RS1').mockResolvedValueOnce('2026-10-RS2');
    tx.requete.create.mockRejectedValueOnce(p2002OnId);

    const result = await createRequeteEntite(entiteId, undefined, userId);

    expect(result).toBe(createdRequete);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(generateRequeteId).toHaveBeenCalledTimes(2);
    expect(tx.requete.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ id: '2026-10-RS2' }) }),
    );
    expect(createDefaultRequeteEtapes).toHaveBeenCalledTimes(1);
  });

  it('also retries when the adapter reports the conflicting fields instead of the constraint name', async () => {
    tx.requete.create.mockRejectedValueOnce(p2002({ fields: ['id'] }));

    await expect(createRequeteEntite(entiteId, undefined, userId)).resolves.toBe(createdRequete);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['another Requete constraint', p2002({ index: 'Requete_dematSocialId_key' })],
    ['the primary key of a nested record', p2002({ index: 'PersonneConcernee_pkey' }, 'PersonneConcernee')],
  ])('does not retry a P2002 on %s', async (_label, conflict) => {
    tx.requete.create.mockRejectedValueOnce(conflict);

    await expect(createRequeteEntite(entiteId, undefined, userId)).rejects.toBe(conflict);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
