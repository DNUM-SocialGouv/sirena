import type { ChangeLogAction } from '@/features/changelog/changelog.type';
import { getNoteById } from '@/features/requeteStates/requeteStates.service';
import type { RequeteStateNote, UploadedFile } from '@/libs/prisma';
import createChangelogMiddleware from './changelog.middleware';

type RequeteStateNoteChangelogMiddleware = {
  action: ChangeLogAction;
};

const requeteStateNoteChangelogMiddleware = ({ action }: RequeteStateNoteChangelogMiddleware) =>
  createChangelogMiddleware<RequeteStateNote & { uploadedFiles: UploadedFile[] }>({
    action,
    entity: 'RequeteStateNote',
    getEntityById: async (c) => {
      let id: string | null = null;
      if (c.get('changelogId')) {
        id = c.get('changelogId');
      } else if (c.req.param('id')) {
        id = c.req.param('id');
      }
      if (id) {
        return await getNoteById(id);
      }
      return null;
    },
    getEntityId: (c) => {
      if (c.get('changelogId')) {
        return c.get('changelogId');
      }
      return c.req.param('id');
    },
  });

export default requeteStateNoteChangelogMiddleware;
