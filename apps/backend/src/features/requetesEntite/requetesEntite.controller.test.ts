import { Readable } from 'node:stream';
import { type EntiteType, RECEPTION_TYPE, REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import type { Context, Next } from 'hono';
import { testClient } from 'hono/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '@/helpers/errors';
import appWithLogs from '@/helpers/factories/appWithLogs';
import { getFileStream } from '@/libs/minio';
import type { UploadedFile } from '@/libs/prisma';
import entitesMiddleware from '@/middlewares/entites.middleware';
import pinoLogger from '@/middlewares/pino.middleware';
import { convertDatesToStrings } from '@/tests/formatter';
import { getDirectionsFromRequeteEntiteId } from '../entites/entites.service';
import { updateDateAndTypeRequete } from '../requetes/requetes.service';
import { getUploadedFileById, isFileBelongsToRequete } from '../uploadedFiles/uploadedFiles.service';
import RequetesEntiteController from './requetesEntite.controller';
import {
  closeRequeteForEntite,
  getOtherEntitesAffected,
  getRequeteEntiteById,
  getRequetesEntite,
  hasAccessToRequete,
  updateStatusRequete,
} from './requetesEntite.service';

vi.mock('./requetesEntite.service', () => ({
  closeRequeteForEntite: vi.fn(),
  getRequeteEntiteById: vi.fn(),
  getRequetesEntite: vi.fn(),
  hasAccessToRequete: vi.fn(),
  getOtherEntitesAffected: vi.fn(),
  updateStatusRequete: vi.fn(),
}));

vi.mock('../entites/entites.service', () => ({
  getDirectionsFromRequeteEntiteId: vi.fn(),
}));

vi.mock('@/libs/minio', () => ({
  getFileStream: vi.fn(),
}));

vi.mock('@/middlewares/auth.middleware', () => {
  return {
    default: (c: Context, next: Next) => {
      c.set('userId', 'id1');
      return next();
    },
  };
});

vi.mock('@/middlewares/userStatus.middleware', () => {
  return {
    default: (_: Context, next: Next) => {
      return next();
    },
  };
});

vi.mock('@/middlewares/role.middleware', () => {
  return {
    default: () => {
      return (c: Context, next: Next) => {
        c.set('roleId', 'ENTITY_ADMIN');
        return next();
      };
    },
  };
});

vi.mock('@/middlewares/entites.middleware', () => ({
  default: vi.fn((c: Context, next: Next) => {
    c.set('entiteIds', ['e1', 'e2']);
    c.set('topEntiteId', 'entiteId');
    return next();
  }),
}));

vi.mock('@/features/uploadedFiles/uploadedFiles.service', () => ({
  getUploadedFileById: vi.fn(),
  isFileBelongsToRequete: vi.fn(),
}));

vi.mock('@/middlewares/changelog/changelog.requeteEtape.middleware', () => {
  return {
    default: () => (_: Context, next: Next) => {
      return next();
    },
  };
});

vi.mock('../requetes/requetes.service', () => ({
  updateDateAndTypeRequete: vi.fn(),
}));

export const fakeRequeteEntite = {
  requeteId: 'requeteId',
  entiteId: 'entiteId',
  statutId: 'EN_COURS',
  prioriteId: null,
  entite: {
    id: '456',
    label: 'Entite 456',
    email: 'entite@entite.fr',
    nomComplet: 'Entite Complete',
    emailDomain: 'entite.fr',
    organizationalUnit: 'Unit 1',
    entiteTypeId: 'type1',
    entiteMereId: null,
    departementCode: '12',
    ctcdCode: '123',
    regionCode: '123',
    regLib: 'Region 1',
    dptLib: 'Departement 1',
  },
  requete: {
    id: 'requeteId',
    createdAt: new Date(),
    updatedAt: new Date(),
    commentaire: 'Commentaire',
    receptionDate: new Date(),
    dematSocialId: 123,
    receptionTypeId: 'receptionTypeId',
    declarant: null,
    participant: null,
    situations: [],
    fichiersRequeteOriginale: [],
  },
  requeteEtape: [],
};

describe('RequetesEntite endpoints: /', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getDirectionsFromRequeteEntiteId).mockResolvedValue([]);
  });

  const app = appWithLogs.createApp().use(pinoLogger()).route('/', RequetesEntiteController).onError(errorHandler);
  const client = testClient(app);

  const fakeData = [
    {
      requeteId: 'r1',
      entiteId: 'e1',
      statutId: REQUETE_STATUT_TYPES.EN_COURS,
      requete: {
        id: 'r1',
        createdAt: new Date(),
        updatedAt: new Date(),
        commentaire: 'Commentaire',
        receptionDate: new Date(),
        dematSocialId: 123,
        receptionTypeId: 'receptionTypeId',
        participant: null,
        situations: [],
        declarant: {
          id: 'd1',
          createdAt: new Date(),
          updatedAt: new Date(),
          commentaire: '',
          estNonIdentifiee: false,
          estHandicapee: false,
          estIdentifie: true,
          estVictime: null,
          estVictimeInformee: null,
          victimeInformeeCommentaire: '',
          veutGarderAnonymat: false,
          autrePersonnes: '',
          declarantDeId: 'd1',
          lienAutrePrecision: '',
          lienVictimeId: '',
          participantDeId: '',
          ageId: null,
          identite: null,
          adresse: null,
        },
      },
      prioriteId: null,
      requeteEtape: [],
    },
  ] satisfies Awaited<ReturnType<typeof getRequetesEntite>>['data'];

  describe('GET /', () => {
    it('should return requetesEntite with basic query', async () => {
      vi.mocked(getRequetesEntite).mockResolvedValueOnce({ data: fakeData, total: 1 });

      const res = await client.index.$get({
        query: {},
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        data: convertDatesToStrings(fakeData),
        meta: { total: 1 },
      });

      expect(getRequetesEntite).toHaveBeenCalledWith(['entiteId'], {});
    });

    it('should return meta with offset and limit', async () => {
      vi.mocked(getRequetesEntite).mockResolvedValueOnce({ data: fakeData, total: 1 });

      const res = await client.index.$get({
        query: { offset: '5', limit: '10' },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        data: convertDatesToStrings(fakeData),
        meta: { offset: 5, limit: 10, total: 1 },
      });

      expect(getRequetesEntite).toHaveBeenCalledWith(['entiteId'], { offset: 5, limit: 10 });
    });
  });

  describe('GET /:id/file/:fileId', () => {
    const baseFile: UploadedFile = {
      id: 'file1',
      fileName: 'test.pdf',
      filePath: '/uploads/test.pdf',
      mimeType: 'application/pdf',
      size: 5,
      requeteId: 'requeteId',
      faitSituationId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { originalName: 'report.pdf' },
      entiteId: 'entite1',
      uploadedById: 'user1',
      status: 'PENDING',
      requeteEtapeNoteId: 'step1',
      demarchesEngageesId: null,
      canDelete: true,
    };

    it('streams the file with correct headers (inline) and body content', async () => {
      vi.mocked(getRequeteEntiteById).mockResolvedValueOnce(fakeRequeteEntite);

      vi.mocked(getUploadedFileById).mockResolvedValueOnce(baseFile);
      vi.mocked(isFileBelongsToRequete).mockResolvedValueOnce(true);

      const nodeReadable = Readable.from(Buffer.from('hello'));
      vi.mocked(getFileStream).mockResolvedValueOnce({ stream: nodeReadable, metadata: { encrypted: false } });

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'requeteId', fileId: 'file1' },
      });

      const bodyText = await res.text();

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/pdf');
      expect(res.headers.get('content-disposition')).toBe('inline; filename="report.pdf"');

      expect(bodyText).toBe('hello');

      expect(getUploadedFileById).toHaveBeenCalledWith('file1', ['entiteId']);
      expect(getFileStream).toHaveBeenCalledWith('/uploads/test.pdf');
    });

    it('returns 200 with empty body when file size is 0 (no streaming)', async () => {
      vi.mocked(getRequeteEntiteById).mockResolvedValueOnce(fakeRequeteEntite);

      const emptyFile = { ...baseFile, size: 0 };
      vi.mocked(getUploadedFileById).mockResolvedValueOnce(emptyFile);
      vi.mocked(isFileBelongsToRequete).mockResolvedValueOnce(true);

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'requeteId', fileId: 'file1' },
      });

      const bodyText = await res.text();

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/pdf');
      expect(res.headers.get('content-disposition')).toBe('inline; filename="report.pdf"');
      expect(bodyText).toBe('');

      expect(getFileStream).not.toHaveBeenCalled();
    });

    it('returns 404 when RequeteEntite not found', async () => {
      vi.mocked(getRequeteEntiteById).mockResolvedValueOnce(null);

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'requeteId', fileId: 'file1' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({ message: 'Requete not found' });

      expect(getUploadedFileById).not.toHaveBeenCalled();
      expect(getFileStream).not.toHaveBeenCalled();
    });

    it('returns 404 when user has no access to requete', async () => {
      vi.mocked(getRequeteEntiteById).mockResolvedValueOnce(null);

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'requeteId', fileId: 'file1' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({ message: 'Requete not found' });

      expect(getUploadedFileById).not.toHaveBeenCalled();
      expect(getFileStream).not.toHaveBeenCalled();
    });

    it('returns 404 when file not found', async () => {
      vi.mocked(getRequeteEntiteById).mockResolvedValueOnce(fakeRequeteEntite);
      vi.mocked(getUploadedFileById).mockResolvedValueOnce(null);

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'requeteId', fileId: 'file1' },
      });

      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({ message: 'File not found' });

      expect(getFileStream).not.toHaveBeenCalled();
    });

    it('falls back to fileName when metadata.originalName is missing', async () => {
      vi.mocked(getRequeteEntiteById).mockResolvedValueOnce(fakeRequeteEntite);

      const fileNoMeta = { ...baseFile, metadata: null, fileName: 'fallback.pdf' };
      vi.mocked(getUploadedFileById).mockResolvedValueOnce(fileNoMeta);
      vi.mocked(isFileBelongsToRequete).mockResolvedValueOnce(true);

      const nodeReadable = Readable.from(Buffer.from('x'));
      vi.mocked(getFileStream).mockResolvedValueOnce({ stream: nodeReadable, metadata: { encrypted: false } });

      const res = await client[':id'].file[':fileId'].$get({
        param: { id: 'requeteId', fileId: 'file1' },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-disposition')).toBe('inline; filename="fallback.pdf"');
    });
  });

  describe('GET /:id/other-entites-affected', () => {
    it('should return other entites affected by the requete', async () => {
      const fakeOtherEntites = [
        {
          statutId: 'EN_COURS',
          entite: {
            id: '456',
            label: 'Entite 456',
            email: 'entite@entite.fr',
            nomComplet: 'Entite Complete',
            emailDomain: 'entite.fr',
            organizationalUnit: 'Unit 1',
            entiteTypeId: 'ARS' as EntiteType,
            entiteMereId: null,
            departementCode: '12',
            ctcdCode: '123',
            regionCode: '123',
            regLib: 'Region 1',
            dptLib: 'Departement 1',
          },
          lastEtape: {
            id: 'etape1',
            nom: 'Étape 1',
            estPartagee: false,
            statutId: 'FAIT',
            requeteId: 'r1',
            entiteId: 'e2',
            clotureReasonId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          entiteTypeId: 'ARS',
          id: '1',
          nomComplet: 'ARS Nouvelle-Aquitaine',
          label: 'ARS NA',
        } as const,
      ];
      vi.mocked(getRequeteEntiteById).mockResolvedValueOnce(fakeRequeteEntite);
      vi.mocked(getOtherEntitesAffected).mockResolvedValueOnce(fakeOtherEntites);
      vi.mocked(getDirectionsFromRequeteEntiteId).mockResolvedValueOnce([
        { id: 'dir1', nomComplet: 'Direction 1', label: 'DIR1' },
      ]);

      const res = await client[':id']['other-entites-affected'].$get({
        param: { id: 'requeteId' },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        data: {
          otherEntites: convertDatesToStrings(fakeOtherEntites),
          directions: [{ id: 'dir1', nomComplet: 'Direction 1', label: 'DIR1' }],
        },
      });
      expect(getDirectionsFromRequeteEntiteId).toHaveBeenCalledWith('requeteId', 'entiteId');
    });

    it('should return 404 when requeteEntite not found', async () => {
      vi.mocked(getRequeteEntiteById).mockResolvedValueOnce(null);

      const res = await client[':id']['other-entites-affected'].$get({
        param: { id: 'requeteId' },
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json).toEqual({ message: 'Requete not found' });
    });
  });

  describe('POST /:id/close', () => {
    const mockCloseResult = {
      etapeId: 'etape123',
      closedAt: '2024-01-01T10:00:00.000Z',
      noteId: 'note123',
      etape: {
        id: 'etape123',
        nom: 'Requête clôturée le 01/01/2024',
        estPartagee: false,
        statutId: 'CLOTUREE',
        requeteId: 'requeteId',
        entiteId: 'e1',
        clotureReasonId: 'reason123',
        createdAt: new Date('2024-01-01T10:00:00.000Z'),
        updatedAt: new Date('2024-01-01T10:00:00.000Z'),
      },
      note: {
        id: 'note123',
        texte: 'Test precision',
        authorId: 'id1',
        requeteEtapeId: 'etape123',
        createdAt: new Date('2024-01-01T10:00:00.000Z'),
        updatedAt: new Date('2024-01-01T10:00:00.000Z'),
      },
    };

    it('should close requete successfully with precision and files', async () => {
      vi.mocked(closeRequeteForEntite).mockResolvedValueOnce(mockCloseResult);
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      const res = await client[':id'].close.$post({
        param: { id: 'requeteId' },
        json: {
          reasonId: 'reason123',
          precision: 'Test precision',
          fileIds: ['file1', 'file2'],
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ data: convertDatesToStrings(mockCloseResult) });

      expect(closeRequeteForEntite).toHaveBeenCalledWith(
        'requeteId',
        'entiteId',
        'reason123',
        'id1',
        'Test precision',
        ['file1', 'file2'],
      );
    });

    it('should close requete successfully without precision and files', async () => {
      const mockCloseResultMinimal = {
        etapeId: 'etape123',
        closedAt: '2024-01-01T10:00:00.000Z',
        noteId: 'note123',
        etape: {
          id: 'etape123',
          nom: 'Requête clôturée le 01/01/2024',
          estPartagee: false,
          statutId: 'CLOTUREE',
          requeteId: 'requeteId',
          entiteId: 'e1',
          clotureReasonId: 'reason123',
          createdAt: new Date('2024-01-01T10:00:00.000Z'),
          updatedAt: new Date('2024-01-01T10:00:00.000Z'),
        },
        note: {
          id: 'note123',
          texte: '',
          authorId: 'id1',
          requeteEtapeId: 'etape123',
          createdAt: new Date('2024-01-01T10:00:00.000Z'),
          updatedAt: new Date('2024-01-01T10:00:00.000Z'),
        },
      };

      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);
      vi.mocked(closeRequeteForEntite).mockResolvedValueOnce(mockCloseResultMinimal);

      const res = await client[':id'].close.$post({
        param: { id: 'requeteId' },
        json: {
          reasonId: 'reason123',
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ data: convertDatesToStrings(mockCloseResultMinimal) });

      expect(closeRequeteForEntite).toHaveBeenCalledWith(
        'requeteId',
        'entiteId',
        'reason123',
        'id1',
        undefined,
        undefined,
      );
    });

    it('should return 400 when no topEntiteId is available', async () => {
      vi.mocked(entitesMiddleware).mockImplementationOnce((c: Context, next: Next) => {
        c.set('topEntiteId', null);
        return next();
      });
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      const res = await client[':id'].close.$post({
        param: { id: 'requeteId' },
        json: {
          reasonId: 'reason123',
        },
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json).toEqual({ message: 'You are not allowed to close requetes without topEntiteId.' });

      expect(closeRequeteForEntite).not.toHaveBeenCalled();
    });

    it('should return 404 when requete not found', async () => {
      vi.mocked(closeRequeteForEntite).mockRejectedValueOnce(new Error('REQUETE_NOT_FOUND'));
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      const res = await client[':id'].close.$post({
        param: { id: 'requeteId' },
        json: {
          reasonId: 'reason123',
        },
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json).toEqual({ message: 'Requête not found' });
    });

    it('should return 400 when reason is invalid', async () => {
      vi.mocked(closeRequeteForEntite).mockRejectedValueOnce(new Error('REASON_INVALID'));
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      const res = await client[':id'].close.$post({
        param: { id: 'requeteId' },
        json: {
          reasonId: 'invalidReason',
        },
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json).toEqual({ error: 'REASON_INVALID', message: 'Invalid reason provided' });
    });

    it('should return 403 when requete is already closed', async () => {
      vi.mocked(closeRequeteForEntite).mockRejectedValueOnce(new Error('READONLY_FOR_ENTITY'));
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      const res = await client[':id'].close.$post({
        param: { id: 'requeteId' },
        json: {
          reasonId: 'reason123',
        },
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json).toEqual({
        error: 'READONLY_FOR_ENTITY',
        message: 'Requête is already closed for this entity',
      });
    });

    it('should return 400 when files are invalid', async () => {
      vi.mocked(closeRequeteForEntite).mockRejectedValueOnce(new Error('FILES_INVALID'));
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      const res = await client[':id'].close.$post({
        param: { id: 'requeteId' },
        json: {
          reasonId: 'reason123',
          fileIds: ['invalidFile'],
        },
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json).toEqual({ error: 'FILES_INVALID', message: 'Invalid files provided' });
    });

    it('should return 500 when unexpected error occurs', async () => {
      vi.mocked(closeRequeteForEntite).mockRejectedValueOnce(new Error('UNEXPECTED_ERROR'));
      vi.mocked(hasAccessToRequete).mockResolvedValueOnce(true);

      const res = await client[':id'].close.$post({
        param: { id: 'requeteId' },
        json: {
          reasonId: 'reason123',
        },
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json).toEqual({ error: 'INTERNAL_ERROR', message: 'Internal server error' });
    });
  });

  describe('PATCH /:id/date-type', () => {
    const baseRequeteEntite = {
      ...fakeRequeteEntite,
      statutId: 'OUVERTE',
      requete: {
        ...fakeRequeteEntite.requete,
        receptionTypeId: RECEPTION_TYPE.EMAIL,
      },
    };

    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    it('updates reception date and type and returns updated requete', async () => {
      const newDate = new Date('2025-05-01T00:00:00.000Z');
      const updatedRequete = {
        ...baseRequeteEntite.requete,
        receptionDate: newDate,
        receptionTypeId: RECEPTION_TYPE.COURRIER,
        updatedAt: newDate,
      };

      vi.mocked(getRequeteEntiteById).mockResolvedValueOnce(baseRequeteEntite);
      vi.mocked(updateDateAndTypeRequete).mockResolvedValueOnce(updatedRequete);

      const res = await client[':id']['date-type'].$patch({
        param: { id: 'requeteId' },
        json: {
          receptionDate: formatDate(newDate),
          receptionTypeId: RECEPTION_TYPE.COURRIER,
          controls: { updatedAt: baseRequeteEntite.requete.updatedAt.toISOString() },
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ data: convertDatesToStrings(updatedRequete) });

      expect(updateDateAndTypeRequete).toHaveBeenCalledWith(
        'requeteId',
        { receptionDate: newDate, receptionTypeId: RECEPTION_TYPE.COURRIER },
        { updatedAt: baseRequeteEntite.requete.updatedAt.toISOString() },
      );
      expect(updateStatusRequete).toHaveBeenCalledWith('requeteId', 'entiteId', REQUETE_STATUT_TYPES.EN_COURS);
    });

    it('returns 409 when updateDateAndTypeRequete throws conflict', async () => {
      const conflictError = new Error('CONFLICT: test');
      (conflictError as Error & { conflictData?: unknown }).conflictData = { serverData: { id: 'requeteId' } };

      vi.mocked(getRequeteEntiteById).mockResolvedValueOnce(baseRequeteEntite);
      vi.mocked(updateDateAndTypeRequete).mockRejectedValueOnce(conflictError);

      const res = await client[':id']['date-type'].$patch({
        param: { id: 'requeteId' },
        json: {
          receptionDate: formatDate(new Date('2025-05-02T00:00:00.000Z')),
          receptionTypeId: RECEPTION_TYPE.COURRIER,
        },
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body).toEqual({
        message: 'The requete has been modified by another user.',
        conflictData: { serverData: { id: 'requeteId' } },
      });

      expect(updateStatusRequete).not.toHaveBeenCalled();
    });

    it('allows removing both date and type by setting them to null', async () => {
      const updatedRequete = {
        ...baseRequeteEntite.requete,
        receptionDate: null,
        receptionTypeId: null,
        updatedAt: new Date('2025-05-03T00:00:00.000Z'),
      };

      vi.mocked(getRequeteEntiteById).mockResolvedValueOnce(baseRequeteEntite);
      vi.mocked(updateDateAndTypeRequete).mockResolvedValueOnce(updatedRequete);

      const res = await client[':id']['date-type'].$patch({
        param: { id: 'requeteId' },
        json: {
          receptionDate: null,
          receptionTypeId: null,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ data: convertDatesToStrings(updatedRequete) });

      expect(updateDateAndTypeRequete).toHaveBeenCalledWith(
        'requeteId',
        {
          receptionDate: null,
          receptionTypeId: null,
        },
        undefined,
      );
    });

    it('allows removing only the date by setting it to null', async () => {
      const updatedRequete = {
        ...baseRequeteEntite.requete,
        receptionDate: null,
        receptionTypeId: RECEPTION_TYPE.EMAIL,
        updatedAt: new Date('2025-05-03T00:00:00.000Z'),
      };

      vi.mocked(getRequeteEntiteById).mockResolvedValueOnce(baseRequeteEntite);
      vi.mocked(updateDateAndTypeRequete).mockResolvedValueOnce(updatedRequete);

      const res = await client[':id']['date-type'].$patch({
        param: { id: 'requeteId' },
        json: {
          receptionDate: null,
          receptionTypeId: RECEPTION_TYPE.EMAIL,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ data: convertDatesToStrings(updatedRequete) });

      expect(updateDateAndTypeRequete).toHaveBeenCalledWith(
        'requeteId',
        {
          receptionDate: null,
          receptionTypeId: RECEPTION_TYPE.EMAIL,
        },
        undefined,
      );
    });
  });
});
