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
      } else {
        id = c.req.param('id') ?? null;
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
      return c.req.param('id') ?? null;
    },
    trackedFields: ['texte', 'authorId'],
  });

export default requeteEtapesNotesChangelogMiddleware;
