import fs from 'node:fs';
import { throwHTTPException400BadRequest, throwHTTPException404NotFound } from '@sirena/backend-utils/helpers';
import { ROLES } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi/zod';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import { deleteFileFromMinio, getSignedUrl, uploadFileToMinio } from '@/libs/minio';
import authMiddleware from '@/middlewares/auth.middleware';
import entitesMiddleware from '@/middlewares/entites.middleware';
import roleMiddleware from '@/middlewares/role.middleware';
import extractUploadedFileMiddleware from '@/middlewares/upload.middleware';
import userStatusMiddleware from '@/middlewares/userStatus.middleware';
import {
  createUploadedFileRoute,
  deleteUploadedFileRoute,
  getUploadedFileRoute,
  getUploadedFileSignedUrlRoute,
  getUploadedFilesRoute,
} from './uploadedFiles.route';
import { GetUploadedFilesQuerySchema, UploadedFileParamsIdSchema } from './uploadedFiles.schema';
import { createUploadedFile, deleteUploadedFile, getUploadedFileById, getUploadedFiles } from './uploadedFiles.service';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(userStatusMiddleware)
  .use(roleMiddleware([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.READER, ROLES.WRITER]))
  .use(entitesMiddleware)

  .get('/', getUploadedFilesRoute, zValidator('query', GetUploadedFilesQuerySchema), async (c) => {
    const logger = c.get('logger');
    const query = c.req.valid('query');
    const entiteIds = c.get('entiteIds');

    if (!entiteIds?.length) {
      throwHTTPException400BadRequest('You are not allowed to read uploaded files without entiteIds.', {
        res: c.res,
      });
    }

    const { data, total } = await getUploadedFiles(entiteIds, query);
    logger.info({ uploadedFileCount: data.length, total }, 'Uploaded files list retrieved successfully');

    return c.json({
      data,
      meta: {
        ...(query.offset !== undefined && { offset: query.offset }),
        ...(query.limit !== undefined && { limit: query.limit }),
        total,
      },
    });
  })

  .get('/:id', getUploadedFileRoute, zValidator('param', UploadedFileParamsIdSchema), async (c) => {
    const logger = c.get('logger');
    const id = c.req.valid('param').id;
    const entiteIds = c.get('entiteIds');

    if (!entiteIds?.length) {
      throwHTTPException400BadRequest('You are not allowed to read uploaded files without entiteIds.', {
        res: c.res,
      });
    }

    const uploadedFile = await getUploadedFileById(id, entiteIds);
    if (!uploadedFile) {
      logger.warn({ uploadedFileId: id }, 'Uploaded file not found or unauthorized access');
      throwHTTPException404NotFound('Uploaded file not found', {
        res: c.res,
      });
    }
    logger.info({ uploadedFileId: id }, 'Uploaded file details retrieved successfully');
    return c.json({ data: uploadedFile }, 200);
  })

  .get('/signed-url/:id', getUploadedFileSignedUrlRoute, zValidator('param', UploadedFileParamsIdSchema), async (c) => {
    const logger = c.get('logger');
    const id = c.req.valid('param').id;
    const entiteIds = c.get('entiteIds');

    if (!entiteIds?.length) {
      throwHTTPException400BadRequest('You are not allowed to read uploaded files without entiteIds.', {
        res: c.res,
      });
    }

    const uploadedFile = await getUploadedFileById(id, null);

    if (!uploadedFile) {
      logger.warn({ uploadedFileId: id }, 'Uploaded file not found or unauthorized access');
      throwHTTPException404NotFound('Uploaded file not found', {
        res: c.res,
      });
    }

    const signedUrl = await getSignedUrl(uploadedFile.filePath);

    logger.info({ uploadedFileId: id, signedUrl }, 'Uploaded file signed url retrieved successfully');
    return c.json({ data: { signedUrl } }, 200);
  })

  .post('/', createUploadedFileRoute, extractUploadedFileMiddleware, async (c) => {
    const logger = c.get('logger');
    const uploadedFile = c.get('uploadedFile');
    if (!uploadedFile) {
      throwHTTPException400BadRequest('No file uploaded', {
        res: c.res,
      });
    }

    try {
      const userId = c.get('userId');
      const entiteIds = c.get('entiteIds');
      // Force parent/main entiteId
      const fileEntiteId = entiteIds?.[0];
      if (!fileEntiteId) {
        throwHTTPException400BadRequest('You must have an assigned entite to create an uploaded file.', {
          res: c.res,
        });
      }
      logger.info({ fileName: uploadedFile.fileName }, 'Uploaded file creation requested');

      const { objectPath, rollback: rollbackMinio } = await uploadFileToMinio(
        uploadedFile.tempFilePath,
        uploadedFile.fileName,
        uploadedFile.contentType,
      );

      const fileName = objectPath.split('/')?.[1] || '';
      const id = fileName.split('.')?.[0] || '';

      if (!fileName || !id) {
        throw new Error('File name is not valid');
      }

      const uploadedFileRecord = await createUploadedFile({
        id,
        fileName,
        filePath: objectPath,
        mimeType: uploadedFile.contentType,
        size: uploadedFile.size,
        metadata: { originalName: uploadedFile.fileName },
        entiteId: fileEntiteId,
        uploadedById: userId,
        requeteStateNoteId: null,
        status: 'PENDING',
      }).catch(async (err) => {
        await rollbackMinio(logger);
        throw err;
      });

      logger.info({ uploadedFileId: uploadedFileRecord.id }, 'Uploaded file created successfully');

      return c.json({ data: uploadedFileRecord }, 201);
    } finally {
      await fs.promises.unlink(uploadedFile.tempFilePath);
    }
  })
  .delete('/:id', deleteUploadedFileRoute, zValidator('param', UploadedFileParamsIdSchema), async (c) => {
    const logger = c.get('logger');
    const id = c.req.valid('param').id;
    const userId = c.get('userId');
    const entiteIds = c.get('entiteIds');

    if (!entiteIds?.length) {
      throwHTTPException400BadRequest('You are not allowed to delete uploaded files without entiteIds.', {
        res: c.res,
      });
    }

    // TODO: temporarily remove entiteIds filter. We need to check if the uploaded file is within the EntiteId scope for the user
    const uploadedFile = await getUploadedFileById(id, null);
    if (!uploadedFile) {
      logger.warn({ uploadedFileId: id }, 'Uploaded file not found or unauthorized access');
      throwHTTPException404NotFound('Uploaded file not found', {
        res: c.res,
      });
    }

    await deleteUploadedFile(id);

    await deleteFileFromMinio(uploadedFile.filePath);

    logger.info({ uploadedFileId: id, userId }, 'Uploaded file deleted successfully');

    return c.body(null, 204);
  });

export default app;
