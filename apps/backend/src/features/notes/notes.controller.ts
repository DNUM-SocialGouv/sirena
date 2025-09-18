import { throwHTTPException403Forbidden, throwHTTPException404NotFound } from '@sirena/backend-utils/helpers';
import { ROLES } from '@sirena/common/constants';
import { validator as zValidator } from 'hono-openapi/zod';
import { ChangeLogAction } from '@/features/changelog/changelog.type';
import { getRequeteEtapeById } from '@/features/requeteEtapes/requetesEtapes.service';
import { isUserOwner, setNoteFile } from '@/features/uploadedFiles/uploadedFiles.service';
import factoryWithLogs from '@/helpers/factories/appWithLogs';
import authMiddleware from '@/middlewares/auth.middleware';
import requeteEtapesNotesChangelogMiddleware from '@/middlewares/changelog/changelog.requeteEtapeNote.middleware';
import entitesMiddleware from '@/middlewares/entites.middleware';
import roleMiddleware from '@/middlewares/role.middleware';
import userStatusMiddleware from '@/middlewares/userStatus.middleware';
import { hasAccessToRequete } from '../requetesEntite/requetesEntite.service';
import { addNoteRoute, deleteNoteRoute, updateNoteRoute } from './notes.route';
import { addNoteBodySchema, updateNoteBodySchema } from './notes.schema';
import { addNote, deleteNote, getNoteById, updateNote } from './notes.service';

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
      const { requeteEtapeId } = body;

      const requeteEtape = await getRequeteEtapeById(requeteEtapeId);

      if (!requeteEtape) {
        return throwHTTPException404NotFound('RequeteEtape not found', { res: c.res });
      }

      // TODO: check real access with entiteIds when implemented
      //   const entiteIds = c.get('entiteIds');
      const hasAccess = await hasAccessToRequete({
        requeteId: requeteEtape.requeteId,
        entiteId: requeteEtape.entiteId,
      });
      if (!hasAccess) {
        return throwHTTPException403Forbidden('You are not allowed to add notes to this requete etape', {
          res: c.res,
        });
      }

      const fileIds = body.fileIds || [];
      if (fileIds.length > 0) {
        const isAllowed = await isUserOwner(userId, fileIds);

        if (!isAllowed) {
          return throwHTTPException403Forbidden('You are not allowed to add notes with these files', {
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
        // TODO: set requeteEntite entiteId to the note
        await setNoteFile(note.id, fileIds, null);
      }

      c.set('changelogId', note.id);

      logger.info({ requeteEtapeId, noteId: note.id, userId }, 'note added successfully');

      return c.json({ data: note }, 201);
    },
  )

  .patch(
    '/:noteId',
    updateNoteRoute,
    zValidator('json', updateNoteBodySchema),
    requeteEtapesNotesChangelogMiddleware({ action: ChangeLogAction.UPDATED }),
    async (c) => {
      const logger = c.get('logger');
      const { noteId } = c.req.param();
      const body = c.req.valid('json');
      const userId = c.get('userId');

      const existingNote = await getNoteById(noteId);

      if (!existingNote) {
        return throwHTTPException404NotFound('Note not found', { res: c.res });
      }

      const requeteEtape = await getRequeteEtapeById(existingNote.requeteEtapeId);

      if (!requeteEtape) {
        return throwHTTPException404NotFound('RequeteEtape not found', { res: c.res });
      }

      // TODO: check real access with entiteIds when implemented
      const hasAccess = await hasAccessToRequete({
        requeteId: requeteEtape.requeteId,
        entiteId: requeteEtape.entiteId,
      });
      if (!hasAccess) {
        return throwHTTPException403Forbidden('You are not allowed to update this requete etape', {
          res: c.res,
        });
      }

      const updatedNote = await updateNote(noteId, body.texte);

      const fileIds = body.fileIds || [];
      if (fileIds.length > 0) {
        const isAllowed = await isUserOwner(userId, fileIds);

        if (!isAllowed) {
          return throwHTTPException403Forbidden('You are not allowed to add these files to the note', {
            res: c.res,
          });
        }

        // TODO: set requeteEntite entiteId to the note
        await setNoteFile(noteId, fileIds, null);
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

      const existingNote = await getNoteById(noteId);

      if (!existingNote) {
        return throwHTTPException404NotFound('Note not found', { res: c.res });
      }

      const requeteEtape = await getRequeteEtapeById(existingNote.requeteEtapeId);

      if (!requeteEtape) {
        return throwHTTPException404NotFound('RequeteEtape not found', { res: c.res });
      }

      // TODO: check real access with entiteIds when implemented
      const hasAccess = await hasAccessToRequete({
        requeteId: requeteEtape.requeteId,
        entiteId: requeteEtape.entiteId,
      });
      if (!hasAccess) {
        return throwHTTPException403Forbidden('You are not allowed to delete notes from this requete etape', {
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
