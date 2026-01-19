import {
  throwHTTPException400BadRequest,
  throwHTTPException403Forbidden,
  throwHTTPException404NotFound,
} from '@sirena/backend-utils/helpers';
import { ROLES } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi';
import factoryWithLogs from '../../helpers/factories/appWithLogs.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import requeteEtapesNotesChangelogMiddleware from '../../middlewares/changelog/changelog.requeteEtapeNote.middleware.js';
import entitesMiddleware from '../../middlewares/entites.middleware.js';
import roleMiddleware from '../../middlewares/role.middleware.js';
import userStatusMiddleware from '../../middlewares/userStatus.middleware.js';
import { ChangeLogAction } from '../changelog/changelog.type.js';
import { getRequeteEtapeById } from '../requeteEtapes/requetesEtapes.service.js';
import { hasAccessToRequete } from '../requetesEntite/requetesEntite.service.js';
import { isUserOwner, setNoteFile } from '../uploadedFiles/uploadedFiles.service.js';
import { addNoteRoute, deleteNoteRoute, updateNoteRoute } from './notes.route.js';
import { addNoteBodySchema, updateNoteBodySchema } from './notes.schema.js';
import { addNote, deleteNote, getNoteById, updateNote } from './notes.service.js';

const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(roleMiddleware([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER]))
  .use(userStatusMiddleware)
  .use(entitesMiddleware)

  .post(
    '/',
    addNoteRoute,
    zValidator('json', addNoteBodySchema),
    requeteEtapesNotesChangelogMiddleware({ action: ChangeLogAction.CREATED }),
    async (c) => {
      const logger = c.get('logger');
      const body = c.req.valid('json');
      const userId = c.get('userId');
      const topEntiteId = c.get('topEntiteId');
      if (!topEntiteId) {
        throwHTTPException400BadRequest('You are not allowed to read requetes without topEntiteId.', {
          res: c.res,
        });
      }
      const { requeteEtapeId } = body;

      const requeteEtape = await getRequeteEtapeById(requeteEtapeId);

      if (!requeteEtape) {
        throwHTTPException404NotFound('RequeteEtape not found', { res: c.res });
      }

      if (topEntiteId !== requeteEtape.entiteId) {
        throwHTTPException403Forbidden('You are not allowed to add notes to this requete etape', {
          res: c.res,
        });
      }

      const hasAccessToReq = await hasAccessToRequete({
        requeteId: requeteEtape.requeteId,
        entiteId: topEntiteId,
      });

      if (!hasAccessToReq) {
        throwHTTPException403Forbidden('You are not allowed to add notes to this requete etape', {
          res: c.res,
        });
      }

      const fileIds = body.fileIds || [];
      if (fileIds.length > 0) {
        const isAllowed = await isUserOwner(userId, fileIds);

        if (!isAllowed) {
          throwHTTPException403Forbidden('You are not allowed to add notes with these files', {
            res: c.res,
          });
        }
      }

      const note = await addNote({
        userId,
        requeteEtapeId,
        texte: body.texte,
        fileIds,
      });

      if (fileIds.length > 0) {
        await setNoteFile(note.id, fileIds, topEntiteId);
      }

      c.set('changelogId', note.id);

      logger.info({ requeteEtapeId, noteId: note.id, userId }, 'note added successfully');

      return c.json({ data: note }, 201);
    },
  )

  .patch(
    '/:id',
    updateNoteRoute,
    zValidator('json', updateNoteBodySchema),
    requeteEtapesNotesChangelogMiddleware({ action: ChangeLogAction.UPDATED }),
    async (c) => {
      const logger = c.get('logger');
      const { id: noteId } = c.req.param();
      const body = c.req.valid('json');
      const userId = c.get('userId');
      const topEntiteId = c.get('topEntiteId');
      if (!topEntiteId) {
        throwHTTPException400BadRequest('You are not allowed to read requetes without topEntiteId.', {
          res: c.res,
        });
      }

      const existingNote = await getNoteById(noteId);

      if (!existingNote) {
        throwHTTPException404NotFound('Note not found', { res: c.res });
      }

      const requeteEtape = await getRequeteEtapeById(existingNote.requeteEtapeId);

      if (!requeteEtape) {
        throwHTTPException404NotFound('RequeteEtape not found', { res: c.res });
      }

      if (topEntiteId !== requeteEtape.entiteId) {
        throwHTTPException403Forbidden('You are not allowed to update this requete etape', {
          res: c.res,
        });
      }

      const hasAccessToReq = await hasAccessToRequete({
        requeteId: requeteEtape.requeteId,
        entiteId: topEntiteId,
      });
      if (!hasAccessToReq) {
        throwHTTPException403Forbidden('You are not allowed to update this requete etape', {
          res: c.res,
        });
      }

      const updatedNote = await updateNote(noteId, body.texte);

      const fileIds = body.fileIds || [];
      if (fileIds.length > 0) {
        const isAllowed = await isUserOwner(userId, fileIds);

        if (!isAllowed) {
          throwHTTPException403Forbidden('You are not allowed to add these files to the note', {
            res: c.res,
          });
        }

        await setNoteFile(noteId, fileIds, topEntiteId);
      }

      c.set('changelogId', noteId);

      logger.info(
        { requeteEtapeId: existingNote.requeteEtapeId, noteId, userId, fileIdsAdded: fileIds.length },
        'note updated successfully',
      );

      return c.json({ data: updatedNote });
    },
  )

  .delete(
    '/:noteId',
    deleteNoteRoute,
    requeteEtapesNotesChangelogMiddleware({ action: ChangeLogAction.DELETED }),
    async (c) => {
      const logger = c.get('logger');
      const { noteId } = c.req.param();
      const userId = c.get('userId');
      const topEntiteId = c.get('topEntiteId');
      if (!topEntiteId) {
        throwHTTPException400BadRequest('You are not allowed to read requetes without topEntiteId.', {
          res: c.res,
        });
      }
      const existingNote = await getNoteById(noteId);

      if (!existingNote) {
        throwHTTPException404NotFound('Note not found', { res: c.res });
      }

      const requeteEtape = await getRequeteEtapeById(existingNote.requeteEtapeId);

      if (!requeteEtape) {
        throwHTTPException404NotFound('RequeteEtape not found', { res: c.res });
      }

      if (topEntiteId !== requeteEtape.entiteId) {
        throwHTTPException403Forbidden('You are not allowed to delete this requete etape', {
          res: c.res,
        });
      }

      const hasAccessToReq = await hasAccessToRequete({
        requeteId: requeteEtape.requeteId,
        entiteId: topEntiteId,
      });
      if (!hasAccessToReq) {
        throwHTTPException403Forbidden('You are not allowed to delete this requete etape', {
          res: c.res,
        });
      }

      await deleteNote(noteId, logger, userId);

      c.set('changelogId', noteId);

      logger.info({ requeteEtapeId: existingNote.requeteEtapeId, noteId, userId }, 'note deleted successfully');

      return c.body(null, 204);
    },
  );

export default app;
