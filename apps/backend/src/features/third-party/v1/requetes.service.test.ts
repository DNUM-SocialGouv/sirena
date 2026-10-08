/** biome-ignore-all lint/suspicious/noExplicitAny: <tests purposes> */
import { REPONSE_OUI_NON } from '@sirena/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addFileProcessingJob } from '../../../jobs/queues/fileProcessing.queue.js';
import { prisma } from '../../../libs/__mocks__/prisma.js';
import { uploadFileToMinio } from '../../../libs/minio.js';
import { Prisma } from '../../../libs/prisma.js';
import { getLieuxType, getResponsable } from '../../dematSocial/dematSocial.adapter.js';
import { generateRequeteId } from '../../requetes/functionalId.service.js';
import { addAttachmentToRequete, createRequeteFromThirdParty } from './requetes.service.js';
import type { CreateRequeteFromThirdPartyDto } from './requetes.type.js';

vi.mock('../../../libs/prisma.js', async (importOriginal) => {
  const { prisma } = await import('../../../libs/__mocks__/prisma.js');
  const actual = await importOriginal<typeof import('../../../libs/prisma.js')>();
  return { ...actual, prisma };
});
vi.mock('../../requetes/functionalId.service.js', () => ({
  generateRequeteId: vi.fn(),
}));
vi.mock('../../../jobs/queues/fileProcessing.queue.js', () => ({
  addFileProcessingJob: vi.fn(),
}));
vi.mock('../../../libs/minio.js', () => ({
  uploadFileToMinio: vi.fn(),
}));
vi.mock('../../../libs/asyncLocalStorage.js', () => ({
  getLoggerStore: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

const ACCOUNT_ID = 'account-1';
const REQUETE_ID = 'RT-2026-02-0001';

const adresse = { label: '20 Bd Gambetta', numero: '20', rue: 'Bd Gambetta', codePostal: '13001', ville: 'Marseille' };

const getDto = (): CreateRequeteFromThirdPartyDto => ({
  thirdPartyAccountId: ACCOUNT_ID,
  receptionDate: new Date('2026-02-18T10:30:00.000Z'),
  receptionTypeId: 'PLATEFORME',
  declarant: {
    nom: 'Durand',
    prenom: 'Marie',
    civiliteId: 'MME',
    email: 'marie.durand@example.com',
    telephone: '0612345678',
    lienVictimeId: 'MEMBRE_FAMILLE',
    estVictime: false,
    veutGarderAnonymat: true,
    adresse,
  },
  victime: {
    nom: 'Durand',
    prenom: 'Jean',
    ageId: '>= 80',
    estHandicapee: false,
    estVictimeInformee: true,
    autrePersonnes: 'Sa fille',
    dateNaissance: undefined,
    adresse,
  },
  situations: [
    {
      lieuDeSurvenue: { codePostal: '13001', lieuTypeId: 'ETABLISSEMENT_PERSONNES_AGEES', adresse },
      misEnCause: { misEnCauseTypeId: 'ETABLISSEMENT', commentaire: 'Manque de personnel' },
      demarchesEngagees: {
        demarches: ['CONTACT_RESPONSABLES', 'PLAINTE'],
        autoriteTypeId: 'COMMISSARIAT',
        dateContactEtablissement: undefined,
        datePlainte: undefined,
      },
      faits: [
        {
          motifsDeclaratifs: ['PROBLEME_QUALITE_SOINS'],
          consequences: ['SANTE'],
          maltraitanceTypes: ['NEGLIGENCES'],
          dateDebut: undefined,
          dateFin: undefined,
          commentaire: 'Escarre non détectée',
        },
      ],
    },
  ],
});

const mockSuccessfulTransaction = () => {
  prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
  vi.mocked(generateRequeteId).mockResolvedValue(REQUETE_ID);
  prisma.requete.create.mockResolvedValue({ id: REQUETE_ID } as any);
  prisma.personneConcernee.create
    .mockResolvedValueOnce({ id: 'declarant-1' } as any)
    .mockResolvedValueOnce({ id: 'victime-1' } as any);
  prisma.lieuDeSurvenue.create.mockResolvedValue({ id: 'lieu-1' } as any);
  prisma.misEnCause.create.mockResolvedValue({ id: 'mec-1' } as any);
  prisma.autoriteTypeEnum.findUnique.mockResolvedValue({ id: 'COMMISSARIAT' } as any);
  prisma.demarchesEngagees.create.mockResolvedValue({ id: 'dem-1' } as any);
  prisma.situation.create.mockResolvedValue({ id: 'situation-1' } as any);
  prisma.requete.findUniqueOrThrow.mockResolvedValue({ id: REQUETE_ID, thirdPartyAccountId: ACCOUNT_ID } as any);
};

describe('third-party v1 requetes.service.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRequeteFromThirdParty', () => {
    it('creates the requete attached to the calling third-party account', async () => {
      mockSuccessfulTransaction();

      const result = await createRequeteFromThirdParty(getDto());

      expect(generateRequeteId).toHaveBeenCalledWith('TELEPHONIQUE', prisma);
      expect(prisma.requete.create).toHaveBeenCalledWith({
        data: {
          id: REQUETE_ID,
          receptionDate: new Date('2026-02-18T10:30:00.000Z'),
          receptionType: { connect: { id: 'PLATEFORME' } },
          thirdPartyAccount: { connect: { id: ACCOUNT_ID } },
        },
      });
      expect(result).toEqual({ id: REQUETE_ID, thirdPartyAccountId: ACCOUNT_ID });
    });

    it('maps the declarant and the victime to personnes concernées', async () => {
      mockSuccessfulTransaction();

      await createRequeteFromThirdParty(getDto());

      const [[declarantArgs], [victimeArgs]] = prisma.personneConcernee.create.mock.calls;
      expect(declarantArgs.data).toMatchObject({
        identite: {
          create: {
            nom: 'Durand',
            prenom: 'Marie',
            telephone: '0612345678',
            email: 'marie.durand@example.com',
            civilite: { connect: { id: 'MME' } },
          },
        },
        estVictime: false,
        veutGarderAnonymat: REPONSE_OUI_NON.OUI,
        lienVictime: { connect: { id: 'MEMBRE_FAMILLE' } },
        declarantDe: { connect: { id: REQUETE_ID } },
      });
      expect(victimeArgs.data).toMatchObject({
        identite: { create: { nom: 'Durand', prenom: 'Jean', email: '', telephone: '' } },
        estHandicapee: REPONSE_OUI_NON.NON,
        estVictimeInformee: REPONSE_OUI_NON.OUI,
        autrePersonnes: 'Sa fille',
        aAutrePersonnes: REPONSE_OUI_NON.OUI,
        age: { connect: { id: '>= 80' } },
        participantDe: { connect: { id: REQUETE_ID } },
      });
      expect(prisma.adresse.create).toHaveBeenCalledWith({
        data: { ...adresse, personneConcernee: { connect: { id: 'declarant-1' } } },
      });
      expect(prisma.adresse.create).toHaveBeenCalledWith({
        data: { ...adresse, personneConcernee: { connect: { id: 'victime-1' } } },
      });
    });

    it('maps situations with lieu, mis en cause, démarches and faits', async () => {
      mockSuccessfulTransaction();
      const dto = getDto();
      const lieuType = getLieuxType({ lieuTypeId: 'ETABLISSEMENT_PERSONNES_AGEES' });
      const responsable = getResponsable({
        lieuTypeId: 'ETABLISSEMENT_PERSONNES_AGEES',
        responsableTypeId: 'ETABLISSEMENT',
        professionnelResponsableTypeId: null,
      });

      await createRequeteFromThirdParty(dto);

      expect(prisma.lieuDeSurvenue.create.mock.calls[0][0].data).toMatchObject({
        codePostal: '13001',
        lieuType: { connect: { id: lieuType.lieuTypeId } },
      });
      expect(prisma.adresse.create).toHaveBeenCalledWith({
        data: { ...adresse, lieuDeSurvenue: { connect: { id: 'lieu-1' } } },
      });
      expect(prisma.misEnCause.create.mock.calls[0][0].data).toMatchObject({
        autrePrecision: 'Manque de personnel',
        misEnCauseTypeId: responsable?.misEnCauseTypeId,
      });
      expect(prisma.demarchesEngagees.create.mock.calls[0][0].data).toMatchObject({
        autoriteType: { connect: { id: 'COMMISSARIAT' } },
        demarches: { connect: [{ id: 'CONTACT_RESPONSABLES' }, { id: 'PLAINTE' }] },
      });
      expect(prisma.situation.create.mock.calls[0][0].data).toEqual({
        requete: { connect: { id: REQUETE_ID } },
        lieuDeSurvenue: { connect: { id: 'lieu-1' } },
        misEnCause: { connect: { id: 'mec-1' } },
        demarchesEngagees: { connect: { id: 'dem-1' } },
      });
      expect(prisma.fait.create).toHaveBeenCalledWith({
        data: {
          situation: { connect: { id: 'situation-1' } },
          dateDebut: null,
          dateFin: null,
          commentaire: 'Escarre non détectée',
        },
      });
      expect(prisma.faitMotifDeclaratif.createMany).toHaveBeenCalledWith({
        data: [{ situationId: 'situation-1', motifDeclaratifId: 'PROBLEME_QUALITE_SOINS' }],
        skipDuplicates: true,
      });
      expect(prisma.faitConsequence.createMany).toHaveBeenCalledWith({
        data: [{ situationId: 'situation-1', consequenceId: 'SANTE' }],
        skipDuplicates: true,
      });
      expect(prisma.faitMaltraitanceType.createMany).toHaveBeenCalledWith({
        data: [{ situationId: 'situation-1', maltraitanceTypeId: 'NEGLIGENCES' }],
        skipDuplicates: true,
      });
    });

    it('ignores an unknown autorite type instead of failing', async () => {
      mockSuccessfulTransaction();
      prisma.autoriteTypeEnum.findUnique.mockResolvedValue(null);

      await createRequeteFromThirdParty(getDto());

      expect(prisma.demarchesEngagees.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ autoriteType: undefined }),
      });
    });

    it('retries with a new id when the generated id collides', async () => {
      mockSuccessfulTransaction();
      const collision = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      });
      prisma.$transaction.mockRejectedValueOnce(collision).mockImplementationOnce(async (cb: any) => cb(prisma));

      const result = await createRequeteFromThirdParty(getDto());

      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ id: REQUETE_ID, thirdPartyAccountId: ACCOUNT_ID });
    });

    it('does not retry on other errors', async () => {
      prisma.$transaction.mockRejectedValueOnce(new Error('db down'));

      await expect(createRequeteFromThirdParty(getDto())).rejects.toThrow('db down');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('addAttachmentToRequete', () => {
    const file = { buffer: Buffer.from('%PDF'), fileName: 'rapport.pdf', mimeType: 'application/pdf', size: 4 };
    const rollback = vi.fn();

    beforeEach(() => {
      vi.mocked(uploadFileToMinio).mockResolvedValue({
        objectPath: 'uploads/abc-123.pdf',
        rollback,
        encryptionMetadata: { iv: 'iv', authTag: 'tag' },
      } as any);
    });

    it('only looks up requetes owned by the calling account', async () => {
      prisma.requete.findFirst.mockResolvedValueOnce(null);

      const result = await addAttachmentToRequete(REQUETE_ID, ACCOUNT_ID, file);

      expect(prisma.requete.findFirst).toHaveBeenCalledWith({
        where: { id: REQUETE_ID, thirdPartyAccountId: ACCOUNT_ID },
        select: { id: true },
      });
      expect(result).toBeNull();
    });

    it('never uploads nor attaches a file to a requete of another account', async () => {
      prisma.requete.findFirst.mockResolvedValueOnce(null);

      await addAttachmentToRequete('RT-OF-ANOTHER-ACCOUNT', ACCOUNT_ID, file);

      expect(uploadFileToMinio).not.toHaveBeenCalled();
      expect(prisma.uploadedFile.create).not.toHaveBeenCalled();
      expect(addFileProcessingJob).not.toHaveBeenCalled();
    });

    it('uploads the file, records it as pending and queues its processing', async () => {
      prisma.requete.findFirst.mockResolvedValueOnce({ id: REQUETE_ID } as any);
      prisma.uploadedFile.create.mockResolvedValueOnce({
        id: 'abc-123',
        fileName: 'abc-123.pdf',
        filePath: 'uploads/abc-123.pdf',
        mimeType: 'application/pdf',
        size: 4,
      } as any);

      const result = await addAttachmentToRequete(REQUETE_ID, ACCOUNT_ID, file);

      expect(uploadFileToMinio).toHaveBeenCalledWith(file.buffer, 'rapport.pdf', 'application/pdf');
      expect(prisma.uploadedFile.create.mock.calls[0][0].data).toMatchObject({
        id: 'abc-123',
        fileName: 'abc-123.pdf',
        filePath: 'uploads/abc-123.pdf',
        requeteId: REQUETE_ID,
        status: 'PENDING',
        metadata: { originalName: 'rapport.pdf', encryption: { iv: 'iv', authTag: 'tag' } },
      });
      expect(addFileProcessingJob).toHaveBeenCalledWith({
        fileId: 'abc-123',
        fileName: 'abc-123.pdf',
        filePath: 'uploads/abc-123.pdf',
        mimeType: 'application/pdf',
      });
      expect(result).toEqual({ fileId: 'abc-123', fileName: 'abc-123.pdf', mimeType: 'application/pdf', size: 4 });
    });

    it('rolls back the MinIO upload when the database insert fails', async () => {
      prisma.requete.findFirst.mockResolvedValueOnce({ id: REQUETE_ID } as any);
      prisma.uploadedFile.create.mockRejectedValueOnce(new Error('insert failed'));

      await expect(addAttachmentToRequete(REQUETE_ID, ACCOUNT_ID, file)).rejects.toThrow('insert failed');
      expect(rollback).toHaveBeenCalledTimes(1);
      expect(addFileProcessingJob).not.toHaveBeenCalled();
    });
  });
});
