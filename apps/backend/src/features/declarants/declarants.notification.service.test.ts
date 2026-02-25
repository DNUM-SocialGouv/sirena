/** biome-ignore-all lint/suspicious/noExplicitAny: <test purposes> */
import { RECEPTION_TYPE } from '@sirena/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACKNOWLEDGMENT_EMAIL_TEMPLATE_NAME } from '../../config/tipimail.constant.js';
import { sendTipimailEmail } from '../../libs/mail/tipimail.js';
import { prisma } from '../../libs/prisma.js';
import { createChangeLog } from '../changelog/changelog.service.js';
import { sendDeclarantAcknowledgmentEmail } from './declarants.notification.service.js';

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    requete: {
      findUnique: vi.fn(),
    },
    entite: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../libs/mail/tipimail.js', () => ({
  sendTipimailEmail: vi.fn(),
}));

vi.mock('../changelog/changelog.service.js', () => ({
  createChangeLog: vi.fn(),
}));

vi.mock('../../libs/asyncLocalStorage.js', () => ({
  getLoggerStore: vi.fn(() => ({
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('../../libs/minio.js', () => ({
  uploadFileToMinio: vi.fn(),
  deleteFileFromMinio: vi.fn(),
}));

vi.mock('../../libs/mail/mailToPdf.js', () => ({
  generateEmailPdf: vi.fn(),
}));

vi.mock('../uploadedFiles/uploadedFiles.service.js', () => ({
  createUploadedFile: vi.fn(),
}));

vi.mock('../requeteEtapes/requetesEtapes.service.js', () => ({
  updateAcknowledgmentStep: vi.fn(),
  ACKNOWLEDGMENT_STEP_NAME: 'Envoyer un accusé de réception au déclarant',
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

  it('should return early if requete reception type is not eligible (e.g., EMAIL)', async () => {
    mockedPrismaRequete.findUnique.mockResolvedValueOnce({
      id: 'req1',
      receptionTypeId: RECEPTION_TYPE.EMAIL,
      declarant: { identite: { email: 'john@example.com', prenom: 'John', nom: 'Doe' } },
      requeteEntites: [{ entiteId: 'e1' }],
    } as any);

    await sendDeclarantAcknowledgmentEmail('req1');

    expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
  });

  it('should return early if requete reception type is null', async () => {
    mockedPrismaRequete.findUnique.mockResolvedValueOnce({
      id: 'req1',
      receptionTypeId: null,
      declarant: { identite: { email: 'john@example.com', prenom: 'John', nom: 'Doe' } },
      requeteEntites: [{ entiteId: 'e1' }],
    } as any);

    await sendDeclarantAcknowledgmentEmail('req1');

    expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
  });

  it('should return early if declarant has no email', async () => {
    mockedPrismaRequete.findUnique.mockResolvedValueOnce({
      id: 'req1',
      receptionTypeId: RECEPTION_TYPE.FORMULAIRE,
      declarant: { identite: { email: '', prenom: 'John', nom: 'Doe' } },
      requeteEntites: [{ entiteId: 'e1' }],
    } as any);

    await sendDeclarantAcknowledgmentEmail('req1');

    expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
  });

  it('should return early if no entities assigned to requete', async () => {
    mockedPrismaRequete.findUnique.mockResolvedValueOnce({
      id: 'req1',
      receptionTypeId: RECEPTION_TYPE.FORMULAIRE,
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
      receptionTypeId: RECEPTION_TYPE.FORMULAIRE,
      declarant: { identite: { email: 'john@example.com', prenom: 'John', nom: 'Doe' } },
      requeteEntites: [{ entiteId: 'e1' }, { entiteId: 'e2' }],
    } as any);

    mockedPrismaEntite.findMany.mockResolvedValueOnce([]);

    await sendDeclarantAcknowledgmentEmail('req1');

    expect(mockedPrismaEntite.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['e1', 'e2'] }, isActive: true },
      select: { id: true, nomComplet: true, emailContactUsager: true, entiteMereId: true },
    });
    expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
  });

  it('should send acknowledgment email with formatted entiteadmin and entitecomplete for FORMULAIRE', async () => {
    mockedPrismaRequete.findUnique.mockResolvedValueOnce({
      id: 'req1',
      receptionTypeId: RECEPTION_TYPE.FORMULAIRE,
      declarant: {
        identite: { email: 'john@example.com', prenom: 'John', nom: 'Doe' },
      },
      requeteEntites: [{ entiteId: 'e1' }, { entiteId: 'e2' }, { entiteId: 'child1' }],
    } as any);

    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      { id: 'e1', nomComplet: 'ARS Normandie', emailContactUsager: 'contact-ars@ex.com', entiteMereId: null },
      { id: 'e2', nomComplet: 'CD Calvados', emailContactUsager: 'contact-cd@ex.com', entiteMereId: null },
      { id: 'child1', nomComplet: 'UA 14', emailContactUsager: 'contact-ua@ex.com', entiteMereId: 'e1' },
    ] as any);

    mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' } as any);

    await sendDeclarantAcknowledgmentEmail('req1');

    expect(mockedSendTipimailEmail).toHaveBeenCalledWith({
      to: 'john@example.com',
      subject: '',
      text: '',
      template: ACKNOWLEDGMENT_EMAIL_TEMPLATE_NAME,
      substitutions: [
        {
          email: 'john@example.com',
          values: {
            prenomdeclarant: 'John',
            nomdeclarant: 'Doe',
            entiteadmin: 'ARS Normandie et CD Calvados',
            entitecomplete: [
              'ARS Normandie',
              'Adresse e-mail : contact-ars@ex.com',
              '',
              'CD Calvados',
              'Adresse e-mail : contact-cd@ex.com',
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
          acknowledgmentEmailTemplate: ACKNOWLEDGMENT_EMAIL_TEMPLATE_NAME,
          acknowledgmentEmailRecipient: 'john@example.com',
          acknowledgmentEmailEntites: ['ARS Normandie', 'CD Calvados', 'UA 14'],
        }),
      }),
    );
  });

  it('should send acknowledgment email for TELEPHONE reception type', async () => {
    mockedPrismaRequete.findUnique.mockResolvedValueOnce({
      id: 'req1',
      receptionTypeId: RECEPTION_TYPE.TELEPHONE,
      declarant: {
        identite: { email: 'jane@example.com', prenom: 'Jane', nom: 'Smith' },
      },
      requeteEntites: [{ entiteId: 'e1' }],
    } as any);

    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      { id: 'e1', nomComplet: 'ARS Normandie', email: 'ars@ex.com', entiteMereId: null },
    ] as any);

    mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' } as any);

    await sendDeclarantAcknowledgmentEmail('req1');

    expect(mockedSendTipimailEmail).toHaveBeenCalledWith({
      to: 'jane@example.com',
      subject: '',
      text: '',
      template: ACKNOWLEDGMENT_EMAIL_TEMPLATE_NAME,
      substitutions: [
        {
          email: 'jane@example.com',
          values: {
            prenomdeclarant: 'Jane',
            nomdeclarant: 'Smith',
            entiteadmin: 'ARS Normandie',
            entitecomplete: ['ARS Normandie', 'Adresse e-mail : ars@ex.com'].join('\n'),
            signature: '',
          },
        },
      ],
    });
  });

  it('should not fail if changelog creation fails', async () => {
    mockedPrismaRequete.findUnique.mockResolvedValueOnce({
      id: 'req1',
      receptionTypeId: RECEPTION_TYPE.FORMULAIRE,
      declarant: { identite: { email: 'john@example.com', prenom: 'John', nom: 'Doe' } },
      requeteEntites: [{ entiteId: 'e1' }],
    } as any);

    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      { id: 'e1', nomComplet: 'ARS Normandie', emailContactUsager: 'contact-ars@ex.com', entiteMereId: null },
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
