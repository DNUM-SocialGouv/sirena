/** biome-ignore-all lint/suspicious/noExplicitAny: <test purposes> */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DGCS_FALLBACK_EMAIL, NOTIFICATION_ENTITE_AFFECTATION_TEMPLATE_NAME } from '../../config/tipimail.constant.js';
import { sendTipimailEmail } from '../../libs/mail/tipimail.js';
import { prisma } from '../../libs/prisma.js';
import { sendEntiteAssignedNotification } from './entite.notification.service.js';

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    entite: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../libs/mail/tipimail.js', () => ({
  sendTipimailEmail: vi.fn(),
}));

const mockLogger = {
  warn: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
};

vi.mock('../../libs/asyncLocalStorage.js', () => ({
  getLoggerStore: vi.fn(() => mockLogger),
}));

vi.mock('../../config/env.js', () => ({
  envVars: {
    FRONTEND_URI: 'https://sirena.example.gouv.fr',
  },
}));

const mockedPrismaEntite = vi.mocked(prisma.entite);
const mockedSendTipimailEmail = vi.mocked(sendTipimailEmail);

const defaultSelect = {
  id: true,
  nomComplet: true,
  email: true,
  entiteTypeId: true,
  regionCode: true,
};

describe('sendEntiteAssignedNotification()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger.warn.mockClear();
    mockLogger.info.mockClear();
    mockLogger.error.mockClear();
  });

  it('should return early if entiteIds is empty', async () => {
    await sendEntiteAssignedNotification('RD-123-456', []);

    expect(mockedPrismaEntite.findMany).not.toHaveBeenCalled();
    expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
  });

  it('should call prisma.entite.findMany with correct params', async () => {
    mockedPrismaEntite.findMany.mockResolvedValueOnce([]);

    await sendEntiteAssignedNotification('RD-123-456', ['e1', 'e2']);

    expect(mockedPrismaEntite.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['e1', 'e2'] },
        isActive: true,
      },
      select: defaultSelect,
    });
    expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
  });

  it('should return early if no entities found', async () => {
    mockedPrismaEntite.findMany.mockResolvedValueOnce([]);

    await sendEntiteAssignedNotification('RD-123-456', ['e1']);

    expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
  });

  it('should return early if all entities have no email and no fallback', async () => {
    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      { id: 'e1', nomComplet: 'ARS Normandie', email: null, entiteTypeId: 'ARS', regionCode: '28' },
      { id: 'e2', nomComplet: 'CD Calvados', email: '', entiteTypeId: 'CD', regionCode: '28' },
    ] as any);
    mockedPrismaEntite.findUnique.mockResolvedValue({ regionCode: '28', entiteMereId: null } as any);
    mockedPrismaEntite.findFirst.mockResolvedValue(null);

    await sendEntiteAssignedNotification('RD-123-456', ['e1', 'e2']);

    expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
  });

  it('should log warn for entity without email and no fallback', async () => {
    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      { id: 'e1', nomComplet: 'ARS Normandie', email: null, entiteTypeId: 'ARS', regionCode: '28' },
      { id: 'e2', nomComplet: 'CD Calvados', email: 'cd@ex.com', entiteTypeId: 'CD', regionCode: '28' },
    ] as any);
    mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' } as any);

    await sendEntiteAssignedNotification('RD-123-456', ['e1', 'e2']);

    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { requeteId: 'RD-123-456', entiteId: 'e1', nomEntite: 'ARS Normandie' },
      expect.stringContaining('no generic email and no fallback'),
    );
  });

  it('should send email for each entity with email and correct substitutions', async () => {
    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      { id: 'e1', nomComplet: 'ARS Normandie', email: 'ars@ex.com', entiteTypeId: 'ARS', regionCode: '28' },
      { id: 'e2', nomComplet: 'CD Calvados', email: 'cd@ex.com', entiteTypeId: 'CD', regionCode: '28' },
    ] as any);
    mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' } as any);
    mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' } as any);

    await sendEntiteAssignedNotification('RD-123-456', ['e1', 'e2']);

    expect(mockedSendTipimailEmail).toHaveBeenCalledTimes(2);

    expect(mockedSendTipimailEmail).toHaveBeenNthCalledWith(1, {
      to: 'ars@ex.com',
      subject: '',
      text: '',
      template: NOTIFICATION_ENTITE_AFFECTATION_TEMPLATE_NAME,
      substitutions: [
        {
          email: 'ars@ex.com',
          values: {
            numeroRequete: 'RD-123-456',
            entite: 'ARS Normandie',
            lienDetailsRequeteSirena: 'https://sirena.example.gouv.fr/request/RD-123-456',
            signature: '',
          },
        },
      ],
    });

    expect(mockedSendTipimailEmail).toHaveBeenNthCalledWith(2, {
      to: 'cd@ex.com',
      subject: '',
      text: '',
      template: NOTIFICATION_ENTITE_AFFECTATION_TEMPLATE_NAME,
      substitutions: [
        {
          email: 'cd@ex.com',
          values: {
            numeroRequete: 'RD-123-456',
            entite: 'CD Calvados',
            lienDetailsRequeteSirena: 'https://sirena.example.gouv.fr/request/RD-123-456',
            signature: '',
          },
        },
      ],
    });
  });

  it('should skip entities with whitespace-only email', async () => {
    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      { id: 'e1', nomComplet: 'ARS Normandie', email: '   ', entiteTypeId: 'ARS', regionCode: '28' },
      { id: 'e2', nomComplet: 'CD Calvados', email: 'cd@ex.com', entiteTypeId: 'CD', regionCode: '28' },
    ] as any);
    mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' } as any);

    await sendEntiteAssignedNotification('RD-123-456', ['e1', 'e2']);

    expect(mockedSendTipimailEmail).toHaveBeenCalledTimes(1);
    expect(mockedSendTipimailEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'cd@ex.com',
        substitutions: [
          expect.objectContaining({
            email: 'cd@ex.com',
            values: expect.objectContaining({
              entite: 'CD Calvados',
            }),
          }),
        ],
      }),
    );
  });

  it('should not throw if sendTipimailEmail fails for one entity and continue with others', async () => {
    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      { id: 'e1', nomComplet: 'ARS Normandie', email: 'ars@ex.com', entiteTypeId: 'ARS', regionCode: '28' },
      { id: 'e2', nomComplet: 'CD Calvados', email: 'cd@ex.com', entiteTypeId: 'CD', regionCode: '28' },
    ] as any);
    mockedSendTipimailEmail.mockRejectedValueOnce(new Error('SMTP error'));
    mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' } as any);

    await expect(sendEntiteAssignedNotification('RD-123-456', ['e1', 'e2'])).resolves.toBeUndefined();

    expect(mockedSendTipimailEmail).toHaveBeenCalledTimes(2);
  });

  it('should handle prisma findMany error', async () => {
    mockedPrismaEntite.findMany.mockRejectedValueOnce(new Error('db down'));

    await expect(sendEntiteAssignedNotification('RD-123-456', ['e1'])).rejects.toThrow('db down');

    expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
  });

  it('should send to ARS when CD has no email (fallback CD → ARS)', async () => {
    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      { id: 'e-cd', nomComplet: 'CD Calvados', email: '', entiteTypeId: 'CD', regionCode: '28' },
    ] as any);
    mockedPrismaEntite.findUnique.mockResolvedValue({ regionCode: '28', entiteMereId: null } as any);
    mockedPrismaEntite.findFirst.mockResolvedValueOnce({
      email: 'ars-normandie@ars.sante.fr',
    } as any);
    mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' } as any);

    await sendEntiteAssignedNotification('RD-123-456', ['e-cd']);

    expect(mockedSendTipimailEmail).toHaveBeenCalledTimes(1);
    expect(mockedSendTipimailEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ars-normandie@ars.sante.fr',
        substitutions: [
          expect.objectContaining({
            email: 'ars-normandie@ars.sante.fr',
            values: expect.objectContaining({
              entite: 'CD Calvados',
            }),
          }),
        ],
      }),
    );
  });

  it('should send to DGCS when DD has no email (fallback DD → DGCS)', async () => {
    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      { id: 'e-dd', nomComplet: 'DDETS 76', email: '', entiteTypeId: 'DD', regionCode: '28' },
    ] as any);
    mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' } as any);

    await sendEntiteAssignedNotification('RD-123-456', ['e-dd']);

    expect(mockedSendTipimailEmail).toHaveBeenCalledTimes(1);
    expect(mockedSendTipimailEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: DGCS_FALLBACK_EMAIL,
        substitutions: [
          expect.objectContaining({
            email: DGCS_FALLBACK_EMAIL,
            values: expect.objectContaining({
              entite: 'DDETS 76',
            }),
          }),
        ],
      }),
    );
  });
});
