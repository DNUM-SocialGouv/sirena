import { throwHTTPException400BadRequest, throwHTTPException404NotFound } from '@sirena/backend-utils/helpers';
import { ERROR_KIND, RECEPTION_TYPE } from '@sirena/common/constants';
import factoryWithLogs from '../../../helpers/factories/appWithLogs.js';
import { isPayloadDebugEnabled } from '../../../helpers/logs.js';
import extractUploadedFileMiddleware from '../../../middlewares/upload.middleware.js';
import { sendDeclarantAcknowledgmentEmail } from '../../declarants/declarants.notification.service.js';
import { assignEntitesToRequeteTask } from '../../dematSocial/affectation/affectation.js';
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

    if (isPayloadDebugEnabled()) {
      logger.info({ payload }, 'Third-party incoming payload (POST /requetes)');
    }

    const requete = await createRequeteFromThirdParty({
      thirdPartyAccountId: apiKey.account.id,
      receptionDate: payload.receptionDate || new Date(),
      receptionTypeId: RECEPTION_TYPE.PLATEFORME,
      declarant: payload.declarant,
      victime: payload.victime,
      situations: payload.situations,
    });

    logger.info({ requeteId: requete.id }, 'Requete created successfully via third-party API');

    c.header('x-trace-id', traceId);

    // Run affectation asynchronously
    assignEntitesToRequeteTask(requete.id)
      .then(() => {
        logger.info({ requeteId: requete.id }, 'Requete auto-assigned to entities (phone platform)');
      })
      .catch((err) => {
        logger.error(
          { requeteId: requete.id, err },
          'Automatic affectation failed (phone platform) (requete created, retry affectation if needed)',
        );
      })
      .finally(async () => {
        // Send acknowledgment email after affectation attempt
        try {
          await sendDeclarantAcknowledgmentEmail(requete.id);
        } catch (emailErr) {
          logger.error(
            { requeteId: requete.id, err: emailErr },
            'Failed to send acknowledgment email (phone platform)',
          );
        }
      });

    const response = {
      requeteId: requete.id,
      receptionDate: requete.receptionDate,
      receptionTypeId: requete.receptionTypeId,
      createdAt: requete.createdAt,
    };

    if (isPayloadDebugEnabled()) {
      logger.info({ response }, 'Third-party outgoing response (POST /requetes)');
    }

    return c.json(response, 200);
  })
  .post(
    '/:requeteId/attachments',
    postAttachmentRoute,
    postAttachmentParamsValidator,
    // Streams the file: multipart parsing, MIME sniffing on the first bytes and MAX_FILE_SIZE
    // enforcement without ever buffering the whole body.
    extractUploadedFileMiddleware,
    async (c) => {
      const logger = c.get('logger');
      const traceId = (logger.bindings() as { traceId?: string }).traceId ?? 'unknown';
      const apiKey = getRequiredApiKey(c);
      const { requeteId } = c.req.valid('param');

      const uploadedFile = c.get('uploadedFile');
      if (!uploadedFile) {
        throwHTTPException400BadRequest('No file uploaded. Send a file in the "file" field.', {
          res: c.res,
          kind: ERROR_KIND.BUSINESS,
        });
      }

      const { stream, fileName, contentType: mimeType, getReadBytes } = uploadedFile;

      if (isPayloadDebugEnabled()) {
        logger.info({ requeteId, fileName, mimeType }, 'Third-party incoming payload (POST /requetes/:id/attachments)');
      }

      const result = await addAttachmentToRequete(requeteId, apiKey.account.id, {
        stream,
        fileName,
        mimeType,
        getSize: getReadBytes,
      });

      if (!result) {
        throwHTTPException404NotFound('Requete not found or not owned by this account', {
          res: c.res,
          kind: ERROR_KIND.BUSINESS,
        });
      }

      logger.info({ requeteId, fileId: result.fileId }, 'Attachment added via third-party API');

      if (isPayloadDebugEnabled()) {
        logger.info({ response: result }, 'Third-party outgoing response (POST /requetes/:id/attachments)');
      }

      c.header('x-trace-id', traceId);
      return c.json(result, 200);
    },
  );

export default app;
