import type { ChangeLogAction } from '../../features/changelog/changelog.type.js';
import { getNoteById } from '../../features/notes/notes.service.js';
import type { RequeteEtapeNote } from '../../libs/prisma.js';
import createChangelogMiddleware from './changelog.middleware.js';

type requeteEtapesNotesChangelogMiddleware = {
  action: ChangeLogAction;
};

const requeteEtapesNotesChangelogMiddleware = ({ action }: requeteEtapesNotesChangelogMiddleware) =>
  createChangelogMiddleware<RequeteEtapeNote>({
    action,
    entity: 'RequeteEtapeNote',
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
    trackedFields: ['texte', 'authorId'],
  });

export default requeteEtapesNotesChangelogMiddleware;
