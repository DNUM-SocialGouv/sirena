import { PassThrough, Readable } from 'node:stream';
import { API_ERROR_CODES, ERROR_KIND, RECEPTION_TYPE } from '@sirena/common/constants';
import type { Context, Next } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../../helpers/errors.js';
import appWithLogs from '../../../helpers/factories/appWithLogs.js';
import { sendDeclarantAcknowledgmentEmail } from '../../declarants/declarants.notification.service.js';
import { assignEntitesToRequeteTask } from '../../dematSocial/affectation/affectation.js';
import RequetesController from './requetes.controller.js';
import { AttachmentStorageUnavailableError } from './requetes.errors.js';
import { addAttachmentToRequete, createRequeteFromThirdParty, type ThirdPartyAttachment } from './requetes.service.js';

vi.mock('./requetes.service.js', () => ({
  createRequeteFromThirdParty: vi.fn(),
  addAttachmentToRequete: vi.fn(),
}));

vi.mock('../../dematSocial/affectation/affectation.js', () => ({
  assignEntitesToRequeteTask: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../declarants/declarants.notification.service.js', () => ({
  sendDeclarantAcknowledgmentEmail: vi.fn(() => Promise.resolve()),
}));

// Keeps the real MinIO client from being created at import.
vi.mock('../../../libs/minio.js', () => ({
  isStorageUnavailableError: vi.fn(() => false),
}));

vi.mock('../../../helpers/logs.js', () => ({
  isPayloadDebugEnabled: vi.fn(() => false),
}));

vi.mock('../../../config/files.constant.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../config/files.constant.js')>()),
  MAX_FILE_SIZE: 1024,
}));

const ACCOUNT_ID = 'account-1';
const TRACE_ID = 'trace-123';
const REQUEST_ID = 'request-123';

const logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  bindings: () => ({ traceId: TRACE_ID }),
};

const validPayload = {
  receptionDate: '2026-02-18T10:30:00.000Z',
  declarant: {
    nom: 'Durand',
    prenom: 'Marie',
    telephone: '0612345678',
    estVictime: false,
    veutGarderAnonymat: true,
  },
  victime: {
    nom: 'Durand',
    prenom: 'Jean',
    estHandicapee: false,
  },
  situations: [
    {
      lieuDeSurvenue: { codePostal: '13001', lieuTypeId: 'ETABLISSEMENT_PERSONNES_AGEES' },
      misEnCause: { misEnCauseTypeId: 'ETABLISSEMENT' },
      faits: [{ motifsDeclaratifs: ['PROBLEME_QUALITE_SOINS'], maltraitanceTypes: ['NEGLIGENCES'] }],
    },
  ],
};

const createdRequete = {
  id: 'RT-2026-02-0001',
  receptionDate: new Date('2026-02-18T10:30:00.000Z'),
  receptionTypeId: RECEPTION_TYPE.PLATEFORME,
  thirdPartyAccountId: ACCOUNT_ID,
  createdAt: new Date('2026-02-18T11:00:00.000Z'),
};

const PDF_CONTENT = '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n';

const app = appWithLogs
  .createApp()
  .use((c: Context, next: Next) => {
    c.set('logger', logger);
    c.set('apiKey', { id: 'key-1', account: { id: ACCOUNT_ID } });
    // Like the pino middleware: headers set before any response exists.
    c.header('x-request-id', REQUEST_ID);
    return next();
  })
  .route('/', RequetesController)
  .onError(errorHandler);

const postRequete = (body: unknown) =>
  app.request('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

let lastIncoming: Readable | undefined;

type AttachmentPart = { content: Buffer | string; filename: string; type: string };

// The upload middleware parses the raw Node request (c.env.incoming), so the multipart body is
// built by hand and exposed both as the fetch body and as the Node incoming stream.
// `keepOpen` leaves the request body unfinished, like a client still sending it.
const postAttachment = (requeteId: string, file?: AttachmentPart, { keepOpen = false } = {}) => {
  const boundary = '----SirenaTestBoundary';
  const part = file
    ? Buffer.concat([
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.filename}"\r\n` +
            `Content-Type: ${file.type}\r\n\r\n`,
        ),
        Buffer.from(file.content),
        Buffer.from('\r\n'),
      ])
    : Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="comment"\r\n\r\nno file\r\n`);
  const body = Buffer.concat([part, Buffer.from(`--${boundary}--\r\n`)]);
  const headers = {
    'content-type': `multipart/form-data; boundary=${boundary}`,
    'content-length': String(body.length),
  };
  const stream = keepOpen ? new PassThrough() : Readable.from([body]);
  // The file part is complete, the closing delimiter never comes.
  if (keepOpen) (stream as PassThrough).write(Buffer.concat([part, Buffer.from(`--${boundary}`)]));
  const incoming = Object.assign(stream, { headers });
  lastIncoming = incoming;

  return app.request(`/${requeteId}/attachments`, { method: 'POST', headers, body }, { incoming });
};

const consumeStreamAndReturn =
  (result: Awaited<ReturnType<typeof addAttachmentToRequete>>) =>
  async (_requeteId: string, _accountId: string, file: ThirdPartyAttachment) => {
    for await (const _chunk of file.stream) {
      // drain
    }
    return result ? { ...result, size: file.getSize() } : result;
  };

describe('third-party v1 requetes.controller.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /', () => {
    it('creates the requete for the calling account and returns the contract response', async () => {
      vi.mocked(createRequeteFromThirdParty).mockResolvedValueOnce(createdRequete);

      const res = await postRequete(validPayload);

      expect(res.status).toBe(200);
      expect(res.headers.get('x-trace-id')).toBe(TRACE_ID);
      expect(await res.json()).toEqual({
        requeteId: createdRequete.id,
        receptionDate: '2026-02-18T10:30:00.000Z',
        receptionTypeId: RECEPTION_TYPE.PLATEFORME,
        createdAt: '2026-02-18T11:00:00.000Z',
      });
      expect(createRequeteFromThirdParty).toHaveBeenCalledWith(
        expect.objectContaining({
          thirdPartyAccountId: ACCOUNT_ID,
          receptionDate: new Date('2026-02-18T10:30:00.000Z'),
          receptionTypeId: RECEPTION_TYPE.PLATEFORME,
          declarant: expect.objectContaining({ nom: 'Durand', telephone: '0612345678' }),
          victime: expect.objectContaining({ prenom: 'Jean' }),
        }),
      );
      // Let the fire-and-forget follow-up settle so it cannot leak into the next test
      await vi.waitFor(() => expect(sendDeclarantAcknowledgmentEmail).toHaveBeenCalledWith(createdRequete.id));
    });

    it('defaults receptionDate to now when it is not provided', async () => {
      vi.mocked(createRequeteFromThirdParty).mockResolvedValueOnce(createdRequete);
      const { receptionDate: _, ...payload } = validPayload;

      const res = await postRequete(payload);

      expect(res.status).toBe(200);
      const [[dto]] = vi.mocked(createRequeteFromThirdParty).mock.calls;
      expect(dto.receptionDate).toBeInstanceOf(Date);
      await vi.waitFor(() => expect(sendDeclarantAcknowledgmentEmail).toHaveBeenCalledWith(createdRequete.id));
    });

    it('triggers affectation then the acknowledgment email after creation', async () => {
      vi.mocked(createRequeteFromThirdParty).mockResolvedValueOnce(createdRequete);

      await postRequete(validPayload);

      expect(assignEntitesToRequeteTask).toHaveBeenCalledWith(createdRequete.id);
      await vi.waitFor(() => expect(sendDeclarantAcknowledgmentEmail).toHaveBeenCalledWith(createdRequete.id));
    });

    it('still answers 200 and sends the email when affectation fails', async () => {
      vi.mocked(createRequeteFromThirdParty).mockResolvedValueOnce(createdRequete);
      vi.mocked(assignEntitesToRequeteTask).mockRejectedValueOnce(new Error('affectation down'));

      const res = await postRequete(validPayload);

      expect(res.status).toBe(200);
      await vi.waitFor(() => expect(sendDeclarantAcknowledgmentEmail).toHaveBeenCalledWith(createdRequete.id));
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ requeteId: createdRequete.id }),
        expect.stringContaining('Automatic affectation failed'),
      );
    });

    it('logs but does not throw when the acknowledgment email fails', async () => {
      vi.mocked(createRequeteFromThirdParty).mockResolvedValueOnce(createdRequete);
      vi.mocked(sendDeclarantAcknowledgmentEmail).mockRejectedValueOnce(new Error('smtp down'));

      const res = await postRequete(validPayload);

      expect(res.status).toBe(200);
      await vi.waitFor(() =>
        expect(logger.error).toHaveBeenCalledWith(
          expect.objectContaining({ requeteId: createdRequete.id }),
          'Failed to send acknowledgment email (phone platform)',
        ),
      );
    });

    it.each([
      ['empty body', {}],
      ['missing declarant', { victime: validPayload.victime, situations: validPayload.situations }],
      ['empty situations', { ...validPayload, situations: [] }],
      ['situation without faits', { ...validPayload, situations: [{ ...validPayload.situations[0], faits: [] }] }],
      ['invalid declarant email', { ...validPayload, declarant: { ...validPayload.declarant, email: 'not-an-email' } }],
      [
        'unknown lieuTypeId',
        {
          ...validPayload,
          situations: [{ ...validPayload.situations[0], lieuDeSurvenue: { codePostal: '13001', lieuTypeId: 'NOPE' } }],
        },
      ],
      [
        'codePostal shorter than 5 characters',
        {
          ...validPayload,
          situations: [
            {
              ...validPayload.situations[0],
              lieuDeSurvenue: { codePostal: '130', lieuTypeId: 'ETABLISSEMENT_PERSONNES_AGEES' },
            },
          ],
        },
      ],
      ['malformed receptionDate', { ...validPayload, receptionDate: '18/02/2026' }],
    ])('returns 400 without creating anything on %s', async (_, body) => {
      const res = await postRequete(body);

      expect(res.status).toBe(400);
      expect(createRequeteFromThirdParty).not.toHaveBeenCalled();
    });
  });

  describe('POST /:requeteId/attachments', () => {
    const pdf = { content: PDF_CONTENT, filename: 'rapport.pdf', type: 'application/pdf' };

    it('streams the file to the service for a requete owned by the calling account', async () => {
      const result = { fileId: 'file-1', fileName: 'rapport.pdf', mimeType: 'application/pdf', size: 0 };
      vi.mocked(addAttachmentToRequete).mockImplementationOnce(consumeStreamAndReturn(result));

      const res = await postAttachment(createdRequete.id, pdf);

      expect(res.status).toBe(200);
      expect(res.headers.get('x-trace-id')).toBe(TRACE_ID);
      expect(await res.json()).toEqual({ ...result, size: Buffer.byteLength(PDF_CONTENT) });
      expect(addAttachmentToRequete).toHaveBeenCalledWith(
        createdRequete.id,
        ACCOUNT_ID,
        expect.objectContaining({
          stream: expect.any(Readable),
          fileName: 'rapport.pdf',
          mimeType: 'application/pdf',
          getSize: expect.any(Function),
        }),
      );
    });

    it('returns 404 when the requete does not exist or belongs to another account', async () => {
      vi.mocked(addAttachmentToRequete).mockResolvedValueOnce(null);

      const res = await postAttachment('RT-OTHER-ACCOUNT', pdf);

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({
        message: 'Requete not found or not owned by this account',
        cause: { kind: ERROR_KIND.BUSINESS },
      });
    });

    it('returns 400 when no file is sent', async () => {
      const res = await postAttachment(createdRequete.id);

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        message: 'No file uploaded. Send a file in the "file" field.',
        cause: { kind: ERROR_KIND.BUSINESS },
      });
      expect(addAttachmentToRequete).not.toHaveBeenCalled();
    });

    it('returns 400 and stops reading when the file exceeds the maximum size', async () => {
      vi.mocked(addAttachmentToRequete).mockImplementationOnce(
        consumeStreamAndReturn({ fileId: 'file-1', fileName: 'big.pdf', mimeType: 'application/pdf', size: 0 }),
      );

      const res = await postAttachment(createdRequete.id, {
        content: PDF_CONTENT + 'x'.repeat(2048),
        filename: 'big.pdf',
        type: 'application/pdf',
      });

      expect(res.status).toBe(400);
      expect(res.headers.get('x-request-id')).toBe(REQUEST_ID);
      expect(await res.json()).toEqual({
        message: 'File size exceeds the maximum allowed',
        cause: { name: API_ERROR_CODES.FILE_MAX_SIZE, kind: ERROR_KIND.BUSINESS },
      });
    });

    it('returns 503 without reporting an internal error when the storage is unavailable', async () => {
      vi.mocked(addAttachmentToRequete).mockRejectedValueOnce(
        new AttachmentStorageUnavailableError(
          Object.assign(new Error('s3 is unavailable'), { code: 'DEPENDENCY_UNAVAILABLE' }),
        ),
      );

      const res = await postAttachment(createdRequete.id, pdf);

      expect(res.status).toBe(503);
      expect(res.headers.get('x-request-id')).toBe(REQUEST_ID);
      expect(await res.json()).toEqual({
        message: 'Attachment storage is temporarily unavailable, retry later',
        cause: { name: API_ERROR_CODES.STORAGE_UNAVAILABLE, kind: ERROR_KIND.SYSTEM },
      });
      expect(logger.error).not.toHaveBeenCalledWith(expect.anything(), 'Internal server error');
    });

    it('returns 400 without reporting an internal error when the client cuts the upload', async () => {
      // A client reset reads as a transient network error: it must not be taken for a storage outage.
      const reset = Object.assign(new Error('aborted'), { code: 'ECONNRESET' });
      const storageError = new AttachmentStorageUnavailableError(reset);
      vi.mocked(addAttachmentToRequete).mockImplementationOnce(async () => {
        lastIncoming?.destroy(reset);
        throw storageError;
      });

      const res = await postAttachment(createdRequete.id, pdf, { keepOpen: true });

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        message: 'Upload interrupted before the file was fully received',
        cause: { kind: ERROR_KIND.BUSINESS },
      });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ err: storageError }),
        'Third-party attachment upload interrupted by the client',
      );
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('returns 400 when the detected file type is not allowed, whatever the declared type', async () => {
      const elf = Buffer.concat([Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01]), Buffer.alloc(57)]);

      const res = await postAttachment(createdRequete.id, {
        content: elf,
        filename: 'fake.pdf',
        type: 'application/pdf',
      });

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        message: 'File type "application/x-elf" is not allowed',
        cause: { name: API_ERROR_CODES.FILE_TYPE, kind: ERROR_KIND.BUSINESS },
      });
      expect(addAttachmentToRequete).not.toHaveBeenCalled();
    });
  });
});
