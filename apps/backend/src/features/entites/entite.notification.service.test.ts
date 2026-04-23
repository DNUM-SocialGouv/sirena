/** biome-ignore-all lint/suspicious/noExplicitAny: <test purposes> */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DGCS_FALLBACK_EMAIL,
  NOTIFICATION_ENTITE_AFFECTATION_TEMPLATE_NAME,
  NOTIFICATION_SITUATION_ENTITE_TEMPLATE_NAME,
} from '../../config/tipimail.constant.js';
import { sendTipimailEmail } from '../../libs/mail/tipimail.js';
import { prisma } from '../../libs/prisma.js';
import { sendEntiteAssignedNotification, sendSituationEntiteNotification } from './entite.notification.service.js';
import { getEntiteChain } from './entites.service.js';

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

vi.mock('./entites.service.js', () => ({
  getEntiteChain: vi.fn(),
}));

const mockedGetEntiteChain = vi.mocked(getEntiteChain);

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

  it('should return early if all entities have no email and no fallback (type not CD/DD/ARS)', async () => {
    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      { id: 'e1', nomComplet: 'Entité autre', email: null, entiteTypeId: 'OTHER', regionCode: null },
      { id: 'e2', nomComplet: 'Autre entité', email: '', entiteTypeId: 'OTHER', regionCode: null },
    ] as any);

    await sendEntiteAssignedNotification('RD-123-456', ['e1', 'e2']);

    expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
  });

  it('should log warn for entity without email and no fallback (type not CD/DD/ARS)', async () => {
    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      { id: 'e1', nomComplet: 'Entité autre', email: null, entiteTypeId: 'OTHER', regionCode: null },
      { id: 'e2', nomComplet: 'CD Calvados', email: 'cd@ex.com', entiteTypeId: 'CD', regionCode: '28' },
    ] as any);
    mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' } as any);

    await sendEntiteAssignedNotification('RD-123-456', ['e1', 'e2']);

    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { requeteId: 'RD-123-456', entiteId: 'e1', nomEntite: 'Entité autre', entiteTypeId: 'OTHER' },
      expect.stringContaining('no fallback'),
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

  it('should send to DGCS for entity with whitespace-only email (ARS) and to entity email for CD', async () => {
    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      { id: 'e1', nomComplet: 'ARS Normandie', email: '   ', entiteTypeId: 'ARS', regionCode: '28' },
      { id: 'e2', nomComplet: 'CD Calvados', email: 'cd@ex.com', entiteTypeId: 'CD', regionCode: '28' },
    ] as any);
    mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' } as any);
    mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' } as any);

    await sendEntiteAssignedNotification('RD-123-456', ['e1', 'e2']);

    expect(mockedSendTipimailEmail).toHaveBeenCalledTimes(2);
    expect(mockedSendTipimailEmail).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        to: DGCS_FALLBACK_EMAIL,
        substitutions: [
          expect.objectContaining({
            email: DGCS_FALLBACK_EMAIL,
            values: expect.objectContaining({
              entite: 'ARS Normandie',
            }),
          }),
        ],
      }),
    );
    expect(mockedSendTipimailEmail).toHaveBeenNthCalledWith(
      2,
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

  it('should send to DGCS when CD has no email and ARS has no email (fallback CD → DGCS)', async () => {
    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      { id: 'e-cd', nomComplet: 'CD Calvados', email: '', entiteTypeId: 'CD', regionCode: '28' },
    ] as any);
    mockedPrismaEntite.findUnique.mockResolvedValue({ regionCode: '28', entiteMereId: null } as any);
    mockedPrismaEntite.findFirst.mockResolvedValue(null);

    await sendEntiteAssignedNotification('RD-123-456', ['e-cd']);

    expect(mockedSendTipimailEmail).toHaveBeenCalledTimes(1);
    expect(mockedSendTipimailEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: DGCS_FALLBACK_EMAIL,
        substitutions: [
          expect.objectContaining({
            email: DGCS_FALLBACK_EMAIL,
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

  it('should send to DGCS when ARS has no email (fallback ARS → DGCS)', async () => {
    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      { id: 'e-ars', nomComplet: 'ARS Guyane', email: '', entiteTypeId: 'ARS', regionCode: '3' },
    ] as any);
    mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' } as any);

    await sendEntiteAssignedNotification('RD-123-456', ['e-ars']);

    expect(mockedSendTipimailEmail).toHaveBeenCalledTimes(1);
    expect(mockedSendTipimailEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: DGCS_FALLBACK_EMAIL,
        substitutions: [
          expect.objectContaining({
            email: DGCS_FALLBACK_EMAIL,
            values: expect.objectContaining({
              entite: 'ARS Guyane',
            }),
          }),
        ],
      }),
    );
  });
});

describe('sendSituationEntiteNotification()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger.warn.mockClear();
    mockLogger.info.mockClear();
    mockLogger.error.mockClear();
  });

  it('should return early if entiteIds is empty', async () => {
    await sendSituationEntiteNotification('RD-123-456', []);

    expect(mockedPrismaEntite.findMany).not.toHaveBeenCalled();
    expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
  });

  it('should send email to direction/service with email and use root entity name as entite', async () => {
    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      { id: 'dir-1', nomComplet: 'Direction Régionale IdF', email: 'direction-idf@ars.gouv.fr' },
    ] as any);
    mockedGetEntiteChain.mockResolvedValueOnce([
      { id: 'ars-1', nomComplet: 'ARS Île-de-France', entiteMereId: null, label: 'ARS IdF', entiteTypeId: 'ARS' },
      {
        id: 'dir-1',
        nomComplet: 'Direction Régionale IdF',
        entiteMereId: 'ars-1',
        label: 'Direction IdF',
        entiteTypeId: 'DIR',
      },
    ] as any);
    mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' } as any);

    await sendSituationEntiteNotification('RD-123-456', ['dir-1']);

    expect(mockedSendTipimailEmail).toHaveBeenCalledTimes(1);
    expect(mockedSendTipimailEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'direction-idf@ars.gouv.fr',
        template: NOTIFICATION_SITUATION_ENTITE_TEMPLATE_NAME,
        substitutions: [
          expect.objectContaining({
            email: 'direction-idf@ars.gouv.fr',
            values: expect.objectContaining({
              directionService: 'Direction Régionale IdF',
              numeroRequete: 'RD-123-456',
              entite: 'ARS Île-de-France',
            }),
          }),
        ],
      }),
    );
  });

  it('should fallback to own nomComplet as entite when chain is empty', async () => {
    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      { id: 'dir-1', nomComplet: 'Direction Orpheline', email: 'dir@test.fr' },
    ] as any);
    mockedGetEntiteChain.mockResolvedValueOnce([] as any);
    mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' } as any);

    await sendSituationEntiteNotification('RD-123-456', ['dir-1']);

    expect(mockedSendTipimailEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        substitutions: [
          expect.objectContaining({
            values: expect.objectContaining({
              directionService: 'Direction Orpheline',
              entite: 'Direction Orpheline',
            }),
          }),
        ],
      }),
    );
  });

  it('should skip and warn when direction/service has no email', async () => {
    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      { id: 'dir-1', nomComplet: 'Direction sans email', email: '' },
    ] as any);

    await sendSituationEntiteNotification('RD-123-456', ['dir-1']);

    expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.objectContaining({ entiteId: 'dir-1' }), expect.any(String));
  });

  it('should send to multiple entities, skip those without email', async () => {
    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      { id: 'dir-1', nomComplet: 'Direction A', email: 'dir-a@test.fr' },
      { id: 'dir-2', nomComplet: 'Direction B', email: '' },
    ] as any);
    mockedGetEntiteChain.mockResolvedValueOnce([
      { id: 'ars-1', nomComplet: 'ARS Test', entiteMereId: null, label: 'ARS', entiteTypeId: 'ARS' },
    ] as any);
    mockedSendTipimailEmail.mockResolvedValue({ status: 'success' } as any);

    await sendSituationEntiteNotification('RD-123-456', ['dir-1', 'dir-2']);

    expect(mockedSendTipimailEmail).toHaveBeenCalledTimes(1);
    expect(mockedSendTipimailEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'dir-a@test.fr' }));
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
  });

  it('should not throw and log error when Tipimail fails', async () => {
    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      { id: 'dir-1', nomComplet: 'Direction A', email: 'dir-a@test.fr' },
    ] as any);
    mockedGetEntiteChain.mockResolvedValueOnce([
      { id: 'ars-1', nomComplet: 'ARS Test', entiteMereId: null, label: 'ARS', entiteTypeId: 'ARS' },
    ] as any);
    mockedSendTipimailEmail.mockRejectedValueOnce(new Error('tipimail error'));

    await expect(sendSituationEntiteNotification('RD-123-456', ['dir-1'])).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.objectContaining({ entiteId: 'dir-1' }), expect.any(String));
  });
});
