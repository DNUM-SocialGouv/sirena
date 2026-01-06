import { throwHTTPException400BadRequest, throwHTTPException404NotFound } from '@sirena/backend-utils/helpers';
import { ROLES_READ, ROLES_WRITE } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi/zod';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import { addFileProcessingJob } from '@/jobs/queues/fileProcessing.queue';
import { deleteFileFromMinio, uploadFileToMinio } from '@/libs/minio';
import authMiddleware from '@/middlewares/auth.middleware';
import uploadedFileChangelogMiddleware from '@/middlewares/changelog/changelog.uploadedFile.middleware';
import entitesMiddleware from '@/middlewares/entites.middleware';
import roleMiddleware from '@/middlewares/role.middleware';
import extractUploadedFileMiddleware from '@/middlewares/upload.middleware';
import userStatusMiddleware from '@/middlewares/userStatus.middleware';
import { ChangeLogAction } from '../changelog/changelog.type';
import { createUploadedFileRoute, deleteUploadedFileRoute, getFileProcessingStatusRoute } from './uploadedFiles.route';
import { UploadedFileParamsIdSchema } from './uploadedFiles.schema';
import { createUploadedFile, deleteUploadedFile, getUploadedFileById } from './uploadedFiles.service';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(userStatusMiddleware)
  .use(entitesMiddleware)

  .post(
    '/',
    createUploadedFileRoute,
    roleMiddleware([...ROLES_READ]),
    extractUploadedFileMiddleware,
    uploadedFileChangelogMiddleware({ action: ChangeLogAction.CREATED }),
    async (c) => {
      const logger = c.get('logger');
      const uploadedFile = c.get('uploadedFile');
      if (!uploadedFile) {
        throwHTTPException400BadRequest('No file uploaded', {
          res: c.res,
        });
      }

      const userId = c.get('userId');
      const topEntiteId = c.get('topEntiteId');
      if (!topEntiteId) {
        throwHTTPException400BadRequest('You are not allowed to create uploaded files without topEntiteId.', {
          res: c.res,
        });
      }

      logger.info({ fileName: uploadedFile.fileName }, 'Uploaded file creation requested');

      const {
        objectPath,
        rollback: rollbackMinio,
        encryptionMetadata,
      } = await uploadFileToMinio(uploadedFile.buffer, uploadedFile.fileName, uploadedFile.contentType);

      const pathParts = objectPath.split('/');
      const fileName = pathParts[pathParts.length - 1] || '';
      const id = fileName.split('.')[0] || '';

      if (!fileName || !id) {
        throw new Error('File name is not valid');
      }

      const uploadedFileRecord = await createUploadedFile({
        id,
        fileName,
        filePath: objectPath,
        mimeType: uploadedFile.contentType,
        size: uploadedFile.size,
        metadata: {
          originalName: uploadedFile.fileName,
          ...(encryptionMetadata && { encryption: encryptionMetadata }),
        },
        entiteId: topEntiteId,
        uploadedById: userId,
        requeteEtapeNoteId: null,
        requeteId: null,
        faitSituationId: null,
        demarchesEngageesId: null,
        status: 'PENDING',
        canDelete: true,
      }).catch(async (err) => {
        await rollbackMinio();
        throw err;
      });

      logger.info({ uploadedFileId: uploadedFileRecord.id }, 'Uploaded file created successfully');

      await addFileProcessingJob({
        fileId: uploadedFileRecord.id,
        fileName: uploadedFileRecord.fileName,
        filePath: uploadedFileRecord.filePath,
        mimeType: uploadedFileRecord.mimeType,
      });

      logger.info({ uploadedFileId: uploadedFileRecord.id }, 'File processing job queued');

      // Set changelogId for changelog middleware
      c.set('changelogId', uploadedFileRecord.id);

      return c.json({ data: uploadedFileRecord }, 201);
    },
  )
  .delete(
    '/:id',
    deleteUploadedFileRoute,
    roleMiddleware([...ROLES_WRITE]),
    zValidator('param', UploadedFileParamsIdSchema),
    uploadedFileChangelogMiddleware({ action: ChangeLogAction.DELETED }),
    async (c) => {
      const logger = c.get('logger');
      const id = c.req.valid('param').id;
      const userId = c.get('userId');
      const topEntiteId = c.get('topEntiteId');

      if (!topEntiteId) {
        throwHTTPException400BadRequest('You are not allowed to delete uploaded files without topEntiteId.', {
          res: c.res,
        });
      }

      const uploadedFile = await getUploadedFileById(id, [topEntiteId]);
      if (!uploadedFile) {
        logger.warn({ uploadedFileId: id }, 'Uploaded file not found or unauthorized access');
        throwHTTPException404NotFound('Uploaded file not found', {
          res: c.res,
        });
      }

      if (!uploadedFile.canDelete) {
        throwHTTPException400BadRequest('You are not allowed to delete this uploaded file.', {
          res: c.res,
        });
      }

      await deleteUploadedFile(id);

      await deleteFileFromMinio(uploadedFile.filePath);

      // Set changelogId for changelog middleware
      c.set('changelogId', id);

      logger.info({ uploadedFileId: id, userId }, 'Uploaded file deleted successfully');

      return c.body(null, 204);
    },
  )
  .get('/:id/status', getFileProcessingStatusRoute, zValidator('param', UploadedFileParamsIdSchema), async (c) => {
    const id = c.req.valid('param').id;
    const topEntiteId = c.get('topEntiteId');

    if (!topEntiteId) {
      throwHTTPException400BadRequest('You are not allowed to access uploaded files without topEntiteId.', {
        res: c.res,
      });
    }

    const uploadedFile = await getUploadedFileById(id, [topEntiteId]);
    if (!uploadedFile) {
      throwHTTPException404NotFound('Uploaded file not found', {
        res: c.res,
      });
    }

    return c.json({
      data: {
        id: uploadedFile.id,
        status: uploadedFile.status,
        scanStatus: uploadedFile.scanStatus,
        sanitizeStatus: uploadedFile.sanitizeStatus,
        processingError: uploadedFile.processingError,
        safeFilePath: uploadedFile.safeFilePath,
      },
    });
  });

export default app;
