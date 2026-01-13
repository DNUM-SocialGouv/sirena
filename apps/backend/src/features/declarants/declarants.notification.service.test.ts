/** biome-ignore-all lint/suspicious/noExplicitAny: <test purposes> */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChangeLog } from '@/features/changelog/changelog.service';
import { prisma } from '@/libs/prisma';
import { sendTipimailEmail } from '@/libs/tipimail';
import { sendDeclarantAcknowledgmentEmail } from './declarants.notification.service';

vi.mock('@/libs/prisma', () => ({
  prisma: {
    requete: {
      findUnique: vi.fn(),
    },
    entite: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/libs/tipimail', () => ({
  sendTipimailEmail: vi.fn(),
}));

vi.mock('@/features/changelog/changelog.service', () => ({
  createChangeLog: vi.fn(),
}));

vi.mock('@/libs/asyncLocalStorage', () => ({
  getLoggerStore: vi.fn(() => ({
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  })),
}));

const mockedPrismaRequete = vi.mocked(prisma.requete);
const mockedPrismaEntite = vi.mocked(prisma.entite);
const mockedSendTipimailEmail = vi.mocked(sendTipimailEmail);
const mockedCreateChangeLog = vi.mocked(createChangeLog);

describe('sendDeclarantAcknowledgmentEmail()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return early if requete not found', async () => {
    mockedPrismaRequete.findUnique.mockResolvedValueOnce(null);

    await sendDeclarantAcknowledgmentEmail('req1');

    expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
    expect(mockedCreateChangeLog).not.toHaveBeenCalled();
  });

  it('should return early if requete is not from demat.social (no dematSocialId)', async () => {
    mockedPrismaRequete.findUnique.mockResolvedValueOnce({
      id: 'req1',
      dematSocialId: null,
      declarant: { identite: { email: 'john@example.com', prenom: 'John', nom: 'Doe' } },
      requeteEntites: [{ entiteId: 'e1' }],
    } as any);

    await sendDeclarantAcknowledgmentEmail('req1');

    expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
  });

  it('should return early if declarant has no email', async () => {
    mockedPrismaRequete.findUnique.mockResolvedValueOnce({
      id: 'req1',
      dematSocialId: 123,
      declarant: { identite: { email: '', prenom: 'John', nom: 'Doe' } },
      requeteEntites: [{ entiteId: 'e1' }],
    } as any);

    await sendDeclarantAcknowledgmentEmail('req1');

    expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
  });

  it('should return early if no entities assigned to requete', async () => {
    mockedPrismaRequete.findUnique.mockResolvedValueOnce({
      id: 'req1',
      dematSocialId: 123,
      declarant: { identite: { email: 'john@example.com', prenom: 'John', nom: 'Doe' } },
      requeteEntites: [],
    } as any);

    await sendDeclarantAcknowledgmentEmail('req1');

    expect(mockedPrismaEntite.findMany).not.toHaveBeenCalled();
    expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
  });

  it('should return early if no active entities found', async () => {
    mockedPrismaRequete.findUnique.mockResolvedValueOnce({
      id: 'req1',
      dematSocialId: 123,
      declarant: { identite: { email: 'john@example.com', prenom: 'John', nom: 'Doe' } },
      requeteEntites: [{ entiteId: 'e1' }, { entiteId: 'e2' }],
    } as any);

    mockedPrismaEntite.findMany.mockResolvedValueOnce([]);

    await sendDeclarantAcknowledgmentEmail('req1');

    expect(mockedPrismaEntite.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['e1', 'e2'] }, isActive: true },
      select: { id: true, nomComplet: true, email: true, entiteMereId: true },
    });
    expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
  });

  it('should send acknowledgment email with formatted entiteadmin and entitecomplete', async () => {
    mockedPrismaRequete.findUnique.mockResolvedValueOnce({
      id: 'req1',
      dematSocialId: 123,
      declarant: {
        identite: { email: 'john@example.com', prenom: 'John', nom: 'Doe' },
      },
      requeteEntites: [{ entiteId: 'e1' }, { entiteId: 'e2' }, { entiteId: 'child1' }],
    } as any);

    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      { id: 'e1', nomComplet: 'ARS Normandie', email: 'ars@ex.com', entiteMereId: null },
      { id: 'e2', nomComplet: 'CD Calvados', email: 'cd@ex.com', entiteMereId: null },
      { id: 'child1', nomComplet: 'UA 14', email: 'ua@ex.com', entiteMereId: 'e1' },
    ] as any);

    mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' } as any);

    await sendDeclarantAcknowledgmentEmail('req1');

    expect(mockedSendTipimailEmail).toHaveBeenCalledWith({
      to: 'john@example.com',
      subject: '',
      text: '',
      template: 'ar-declarant',
      substitutions: [
        {
          email: 'john@example.com',
          values: {
            prenomdeclarant: 'John',
            nomdeclarant: 'Doe',
            entiteadmin: 'ARS Normandie et CD Calvados',
            entitecomplete: [
              'ARS Normandie',
              'Adresse e-mail : ars@ex.com',
              '',
              'CD Calvados',
              'Adresse e-mail : cd@ex.com',
            ].join('\n'),
            signature: '',
          },
        },
      ],
    });

    expect(mockedCreateChangeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'Requete',
        entityId: 'req1',
        action: expect.any(String),
        after: expect.objectContaining({
          acknowledgmentEmailSent: true,
          acknowledgmentEmailTemplate: 'ar-declarant',
          acknowledgmentEmailRecipient: 'john@example.com',
          acknowledgmentEmailEntites: ['ARS Normandie', 'CD Calvados', 'UA 14'],
        }),
      }),
    );
  });

  it('should not fail if changelog creation fails', async () => {
    mockedPrismaRequete.findUnique.mockResolvedValueOnce({
      id: 'req1',
      dematSocialId: 123,
      declarant: { identite: { email: 'john@example.com', prenom: 'John', nom: 'Doe' } },
      requeteEntites: [{ entiteId: 'e1' }],
    } as any);

    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      { id: 'e1', nomComplet: 'ARS Normandie', email: 'ars@ex.com', entiteMereId: null },
    ] as any);

    mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' } as any);
    mockedCreateChangeLog.mockRejectedValueOnce(new Error('boom'));

    await expect(sendDeclarantAcknowledgmentEmail('req1')).resolves.toBeUndefined();

    expect(mockedSendTipimailEmail).toHaveBeenCalled();
    expect(mockedCreateChangeLog).toHaveBeenCalled();
  });

  it('should handle prisma error gracefully', async () => {
    mockedPrismaRequete.findUnique.mockRejectedValueOnce(new Error('db down'));

    await expect(sendDeclarantAcknowledgmentEmail('req1')).resolves.toBeUndefined();

    expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
    expect(mockedCreateChangeLog).not.toHaveBeenCalled();
  });
});
