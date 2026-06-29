/** biome-ignore-all lint/suspicious/noExplicitAny: <test purposes> */
import { RECEPTION_TYPE } from '@sirena/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACKNOWLEDGMENT_EMAIL_SUBJECT } from '../../config/tipimail.constant.js';
import { sendTipimailEmail } from '../../libs/mail/tipimail.js';
import { uploadFileToMinio } from '../../libs/minio.js';
import { prisma } from '../../libs/prisma.js';
import { createChangeLog } from '../changelog/changelog.service.js';
import { createUploadedFile } from '../uploadedFiles/uploadedFiles.service.js';
import { sendDeclarantAcknowledgmentEmail, sendManualAcknowledgmentEmail } from './declarants.notification.service.js';

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    requete: {
      findUnique: vi.fn(),
    },
    entite: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    requeteEtape: {
      updateMany: vi.fn(),
      findFirst: vi.fn(),
    },
    requeteEtapeNote: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../../libs/mail/tipimail.js', () => ({
  sendTipimailEmail: vi.fn(),
}));

vi.mock('../../jobs/queues/fileProcessing.queue.js', () => ({
  addFileProcessingJob: vi.fn(),
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
  generateEmailPdfFromText: vi.fn().mockResolvedValue(Buffer.from('pdf')),
}));

vi.mock('../uploadedFiles/uploadedFiles.service.js', () => ({
  createUploadedFile: vi.fn(),
}));

vi.mock('../requeteEtapes/requetesEtapes.service.js', () => ({
  updateAcknowledgmentStep: vi.fn(),
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
      select: {
        id: true,
        nomComplet: true,
        email: true,
        emailContactUsager: true,
        telContactUsager: true,
        adresseContactUsager: true,
        entiteMereId: true,
      },
    });
    expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
  });

  it('should send acknowledgment email with formatted content for FORMULAIRE', async () => {
    mockedPrismaRequete.findUnique.mockResolvedValueOnce({
      id: 'req1',
      receptionTypeId: RECEPTION_TYPE.FORMULAIRE,
      declarant: {
        identite: { email: 'john@example.com', prenom: 'John', nom: 'Doe' },
      },
      requeteEntites: [{ entiteId: 'e1' }, { entiteId: 'e2' }, { entiteId: 'child1' }],
    } as any);

    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      {
        id: 'e1',
        nomComplet: 'ARS Normandie',
        email: '',
        emailContactUsager: 'contact-ars@ex.com',
        telContactUsager: '02 31 00 00 00',
        adresseContactUsager: '1 rue Example, 76000 Rouen',
        entiteMereId: null,
      },
      {
        id: 'e2',
        nomComplet: 'CD Calvados',
        email: '',
        emailContactUsager: 'contact-cd@ex.com',
        telContactUsager: '',
        adresseContactUsager: '',
        entiteMereId: null,
      },
      {
        id: 'child1',
        nomComplet: 'UA 14',
        email: '',
        emailContactUsager: 'contact-ua@ex.com',
        telContactUsager: '',
        adresseContactUsager: '',
        entiteMereId: 'e1',
      },
    ] as any);

    mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' } as any);

    await sendDeclarantAcknowledgmentEmail('req1');

    const call = mockedSendTipimailEmail.mock.calls[0][0];
    expect(call.to).toBe('john@example.com');
    expect(call.subject).toBe(ACKNOWLEDGMENT_EMAIL_SUBJECT);
    expect(call.template).toBeUndefined();
    expect(call.substitutions).toBeUndefined();
    expect(call.text).toContain('John');
    expect(call.text).toContain('req1');
    expect(call.text).toContain('ARS Normandie');
    expect(call.text).toContain('CD Calvados');
    expect(call.text).toContain('contact-ars@ex.com');
    expect(call.text).toContain('02 31 00 00 00');
    expect(call.text).toContain('1 rue Example, 76000 Rouen');
    expect(call.text).toContain('contact-cd@ex.com');
    // child entity should not appear in the signature
    expect(call.text).not.toContain('UA 14');
    expect(typeof call.html).toBe('string');

    expect(mockedCreateChangeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'Requete',
        entityId: 'req1',
        after: expect.objectContaining({
          acknowledgmentEmailSent: true,
          acknowledgmentEmailRecipient: 'john@example.com',
          acknowledgmentEmailEntites: ['ARS Normandie', 'CD Calvados', 'UA 14'],
        }),
      }),
    );
  });

  it('should send acknowledgment email for PLATEFORME reception type', async () => {
    mockedPrismaRequete.findUnique.mockResolvedValueOnce({
      id: 'req1',
      receptionTypeId: RECEPTION_TYPE.PLATEFORME,
      declarant: {
        identite: { email: 'jane@example.com', prenom: 'Jane', nom: 'Smith' },
      },
      requeteEntites: [{ entiteId: 'e1' }],
    } as any);

    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      {
        id: 'e1',
        nomComplet: 'ARS Normandie',
        email: '',
        emailContactUsager: 'ars@ex.com',
        telContactUsager: '',
        adresseContactUsager: '',
        entiteMereId: null,
      },
    ] as any);

    mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' } as any);

    await sendDeclarantAcknowledgmentEmail('req1');

    const call = mockedSendTipimailEmail.mock.calls[0][0];
    expect(call.to).toBe('jane@example.com');
    expect(call.subject).toBe(ACKNOWLEDGMENT_EMAIL_SUBJECT);
    expect(call.template).toBeUndefined();
    expect(call.text).toContain('Jane');
    expect(call.text).toContain('req1');
    expect(call.text).toContain('ARS Normandie');
    expect(call.text).toContain('ars@ex.com');
    expect(typeof call.html).toBe('string');
  });

  it('should not fail if changelog creation fails', async () => {
    mockedPrismaRequete.findUnique.mockResolvedValueOnce({
      id: 'req1',
      receptionTypeId: RECEPTION_TYPE.FORMULAIRE,
      declarant: { identite: { email: 'john@example.com', prenom: 'John', nom: 'Doe' } },
      requeteEntites: [{ entiteId: 'e1' }],
    } as any);

    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      {
        id: 'e1',
        nomComplet: 'ARS Normandie',
        email: '',
        emailContactUsager: 'contact-ars@ex.com',
        telContactUsager: '',
        adresseContactUsager: '',
        entiteMereId: null,
      },
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

  it('should not send email when no entity has any displayable info (neither contact fields nor email)', async () => {
    mockedPrismaRequete.findUnique.mockResolvedValueOnce({
      id: 'req1',
      receptionTypeId: RECEPTION_TYPE.FORMULAIRE,
      declarant: { identite: { email: 'john@example.com', prenom: 'John', nom: 'Doe' } },
      requeteEntites: [{ entiteId: 'e1' }, { entiteId: 'e2' }],
    } as any);

    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      {
        id: 'e1',
        nomComplet: 'ARS Normandie',
        email: '',
        emailContactUsager: '',
        telContactUsager: '',
        adresseContactUsager: '',
        entiteMereId: null,
      },
      {
        id: 'e2',
        nomComplet: 'CD Calvados',
        email: '',
        emailContactUsager: '',
        telContactUsager: '',
        adresseContactUsager: '',
        entiteMereId: null,
      },
    ] as any);

    await sendDeclarantAcknowledgmentEmail('req1');

    expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
  });

  it('should send email using fallback email field when contact fields are empty', async () => {
    mockedPrismaRequete.findUnique.mockResolvedValueOnce({
      id: 'req1',
      receptionTypeId: RECEPTION_TYPE.FORMULAIRE,
      declarant: { identite: { email: 'john@example.com', prenom: 'John', nom: 'Doe' } },
      requeteEntites: [{ entiteId: 'e1' }],
    } as any);

    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      {
        id: 'e1',
        nomComplet: 'ARS Normandie',
        email: 'ars-interne@example.com',
        emailContactUsager: '',
        telContactUsager: '',
        adresseContactUsager: '',
        entiteMereId: null,
      },
    ] as any);

    mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' } as any);

    await sendDeclarantAcknowledgmentEmail('req1');

    expect(mockedSendTipimailEmail).toHaveBeenCalled();
    const call = mockedSendTipimailEmail.mock.calls[0]?.[0];
    expect(call?.text).toContain('ARS Normandie');
    expect(call?.text).toContain('Adresse e-mail : ars-interne@example.com');
  });

  it('should send email with name only when entity has no info at all', async () => {
    mockedPrismaRequete.findUnique.mockResolvedValueOnce({
      id: 'req1',
      receptionTypeId: RECEPTION_TYPE.FORMULAIRE,
      declarant: { identite: { email: 'john@example.com', prenom: 'John', nom: 'Doe' } },
      requeteEntites: [{ entiteId: 'e1' }, { entiteId: 'e2' }],
    } as any);

    // e1 has contact info, e2 has nothing → email is sent, e2 shows name only
    mockedPrismaEntite.findMany.mockResolvedValueOnce([
      {
        id: 'e1',
        nomComplet: 'ARS Normandie',
        email: '',
        emailContactUsager: 'contact@ars.fr',
        telContactUsager: '',
        adresseContactUsager: '',
        entiteMereId: null,
      },
      {
        id: 'e2',
        nomComplet: 'CD Calvados',
        email: '',
        emailContactUsager: '',
        telContactUsager: '',
        adresseContactUsager: '',
        entiteMereId: null,
      },
    ] as any);

    mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' } as any);

    await sendDeclarantAcknowledgmentEmail('req1');

    expect(mockedSendTipimailEmail).toHaveBeenCalled();
    const call = mockedSendTipimailEmail.mock.calls[0]?.[0];
    // ARS Normandie with email, then blank line, then CD Calvados name only
    expect(call?.text).toContain('ARS Normandie');
    expect(call?.text).toContain('Adresse e-mail : contact@ars.fr');
    expect(call?.text).toContain('CD Calvados');
  });
});

describe('sendManualAcknowledgmentEmail() — PDF attachment', () => {
  const mockedRequeteEtape = vi.mocked(prisma.requeteEtape);
  const mockedRequeteEtapeNote = vi.mocked(prisma.requeteEtapeNote);
  const mockedEntiteFindUnique = vi.mocked(prisma.entite.findUnique);
  const mockedUploadFileToMinio = vi.mocked(uploadFileToMinio);
  const mockedCreateUploadedFile = vi.mocked(createUploadedFile);

  beforeEach(() => {
    vi.clearAllMocks();

    mockedRequeteEtape.updateMany.mockResolvedValue({ count: 1 } as any);
    mockedRequeteEtape.findFirst.mockResolvedValue({ id: 'etapeAck' } as any);

    mockedPrismaRequete.findUnique.mockResolvedValue({
      id: 'req1',
      declarant: { identite: { email: 'john@example.com', prenom: 'John', nom: 'Doe' } },
    } as any);
    mockedEntiteFindUnique.mockResolvedValue({
      id: 'ent1',
      nomComplet: 'ARS Normandie',
      email: '',
      emailContactUsager: 'contact@ars.fr',
      telContactUsager: '',
      adresseContactUsager: '',
      entiteMereId: null,
    } as any);
    mockedSendTipimailEmail.mockResolvedValue({ status: 'success' } as any);

    mockedUploadFileToMinio.mockResolvedValue({
      objectPath: 'acr/file123.pdf',
      rollback: vi.fn(),
      encryptionMetadata: null,
    } as any);
    mockedCreateUploadedFile.mockResolvedValue({ id: 'file123', fileName: 'AR_req1.pdf' } as any);
  });

  it('attaches the AR PDF directly to the étape with the sender as uploadedById and creates no system note', async () => {
    await sendManualAcknowledgmentEmail({
      etapeId: 'etapeAck',
      requeteId: 'req1',
      entiteId: 'ent1',
      userId: 'user123',
    });

    expect(mockedCreateUploadedFile).toHaveBeenCalledWith(
      expect.objectContaining({
        requeteEtapeId: 'etapeAck',
        uploadedById: 'user123',
        canDelete: false,
      }),
    );

    expect(mockedRequeteEtapeNote.create).not.toHaveBeenCalled();
  });
});
