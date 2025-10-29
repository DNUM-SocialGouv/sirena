import { createChangeLog } from '@/features/changelog/changelog.service';
import type { ChangeLogAction } from '@/features/changelog/changelog.type';
import { getUploadedFileById } from '@/features/uploadedFiles/uploadedFiles.service';
import factoryWithChangelog from '@/helpers/factories/appWithChangeLog';
import { isEqual, pick } from '@/helpers/object';
import type { Prisma, UploadedFile } from '@/libs/prisma';

const uploadedFileTrackedFields: (keyof UploadedFile)[] = [
  'id',
  'fileName',
  'filePath',
  'mimeType',
  'size',
  'status',
  'metadata',
  'entiteId',
  'uploadedById',
  'requeteEtapeNoteId',
  'requeteId',
  'faitSituationId',
  'demarchesEngageesId',
];

type UploadedFileChangelogMiddleware = {
  action: ChangeLogAction;
};

const uploadedFileChangelogMiddleware = ({ action }: UploadedFileChangelogMiddleware) => {
  return factoryWithChangelog.createMiddleware(async (c, next) => {
    const changedById = c.get('userId');
    const entiteIds = c.get('entiteIds');

    let uploadedFileBefore: UploadedFile | null = null;

    // For UPDATED and DELETED actions, get the file before the operation
    if (action === 'UPDATED' || action === 'DELETED') {
      const fileId = c.req.param('id');
      if (fileId) {
        uploadedFileBefore = await getUploadedFileById(fileId, entiteIds);
      }
    }

    // Call route/controller
    await next();

    const changelogId = c.get('changelogId');

    if (!changelogId || !changedById) return;

    // Helper function to create changelog for uploaded file
    const createUploadedFileChangelog = async (
      entityId: string,
      action: ChangeLogAction,
      before: Prisma.JsonObject | null,
      after: Prisma.JsonObject | null,
    ) => {
      await createChangeLog({
        entity: 'UploadedFile',
        entityId,
        action,
        before,
        after,
        changedById,
      });
    };

    // Helper function to check if there are changes between before and after data
    const hasChanges = (before: Record<string, unknown>, after: Record<string, unknown>, fields: string[]) => {
      return fields.some((field) => {
        const beforeValue = before[field];
        const afterValue = after[field];
        return !isEqual(beforeValue, afterValue);
      });
    };

    // Handle CREATED action
    if (action === 'CREATED') {
      const uploadedFileAfter = await getUploadedFileById(changelogId, entiteIds);
      if (uploadedFileAfter) {
        const afterPicked = pick(uploadedFileAfter, uploadedFileTrackedFields);
        await createUploadedFileChangelog(changelogId, action, null, afterPicked as unknown as Prisma.JsonObject);
      }
    }

    // Handle UPDATED action
    if (action === 'UPDATED' && uploadedFileBefore) {
      const uploadedFileAfter = await getUploadedFileById(changelogId, entiteIds);
      if (uploadedFileAfter) {
        const beforePicked = pick(uploadedFileBefore, uploadedFileTrackedFields);
        const afterPicked = pick(uploadedFileAfter, uploadedFileTrackedFields);

        if (hasChanges(beforePicked, afterPicked, uploadedFileTrackedFields)) {
          await createUploadedFileChangelog(
            changelogId,
            action,
            beforePicked as unknown as Prisma.JsonObject,
            afterPicked as unknown as Prisma.JsonObject,
          );
        }
      }
    }

    // Handle DELETED action
    if (action === 'DELETED' && uploadedFileBefore) {
      const beforePicked = pick(uploadedFileBefore, uploadedFileTrackedFields);
      await createUploadedFileChangelog(changelogId, action, beforePicked as unknown as Prisma.JsonObject, null);
    }
  });
};

export default uploadedFileChangelogMiddleware;
