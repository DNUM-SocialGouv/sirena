import { throwHTTPException400BadRequest, throwHTTPException404NotFound } from '@sirena/backend-utils/helpers';
import { fileTypeFromBuffer } from 'file-type';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../../../config/files.constant.js';
import factoryWithLogs from '../../../helpers/factories/appWithLogs.js';
import { sanitizeFilename } from '../../../helpers/file.js';
import { getRequiredApiKey } from '../thirdPartyFactory.js';
import {
  postAttachmentParamsValidator,
  postAttachmentRoute,
  postCreateRequeteRoute,
  postCreateRequeteValidator,
} from './requetes.route.js';
import { addAttachmentToRequete, createRequeteFromThirdParty } from './requetes.service.js';

const app = factoryWithLogs
  .createApp()
  .post('/', postCreateRequeteRoute, postCreateRequeteValidator, async (c) => {
    const logger = c.get('logger');
    const traceId = (logger.bindings() as { traceId?: string }).traceId ?? 'unknown';
    const apiKey = getRequiredApiKey(c);

    const payload = c.req.valid('json');
    const requete = await createRequeteFromThirdParty({
      thirdPartyAccountId: apiKey.account.id,
      receptionDate: payload.receptionDate || new Date(),
      receptionTypeId: 'TELEPHONE',
      declarant: payload.declarant,
      victime: payload.victime,
      situations: payload.situations,
    });

    logger.info({ requeteId: requete.id }, 'Requete created successfully via third-party API');

    c.header('x-trace-id', traceId);
    return c.json(
      {
        requeteId: requete.id,
        receptionDate: requete.receptionDate,
        receptionTypeId: requete.receptionTypeId,
        createdAt: requete.createdAt,
      },
      200,
    );
  })
  .post('/:requeteId/attachments', postAttachmentRoute, postAttachmentParamsValidator, async (c) => {
    const logger = c.get('logger');
    const traceId = (logger.bindings() as { traceId?: string }).traceId ?? 'unknown';
    const apiKey = getRequiredApiKey(c);
    const { requeteId } = c.req.valid('param');

    const body = await c.req.parseBody();
    const file = body.file;

    if (!(file instanceof File)) {
      throwHTTPException400BadRequest('No file uploaded. Send a file in the "file" field.', { res: c.res });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_FILE_SIZE) {
      throwHTTPException400BadRequest('File size exceeds the maximum allowed', { res: c.res });
    }

    const detectedType = await fileTypeFromBuffer(buffer);
    const mimeType = detectedType?.mime ?? file.type ?? 'application/octet-stream';

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throwHTTPException400BadRequest(`File type "${mimeType}" is not allowed`, { res: c.res });
    }

    const ext = detectedType?.ext ?? file.name.split('.').pop() ?? '';
    const fileName = sanitizeFilename(file.name, ext);

    const result = await addAttachmentToRequete(requeteId, apiKey.account.id, {
      buffer,
      fileName,
      mimeType,
      size: buffer.length,
    });

    if (!result) {
      throwHTTPException404NotFound('Requete not found or not owned by this account', { res: c.res });
    }

    logger.info({ requeteId, fileId: result.fileId }, 'Attachment added via third-party API');

    c.header('x-trace-id', traceId);
    return c.json(result, 200);
  });

export default app;
