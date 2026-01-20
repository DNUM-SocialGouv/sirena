import { testClient } from 'hono/testing';
import type { PinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChangeLog } from '../../features/changelog/changelog.service.js';
import { ChangeLogAction } from '../../features/changelog/changelog.type.js';
import { getNoteById } from '../../features/notes/notes.service.js';
import appWithAuth from '../../helpers/factories/appWithAuth.js';
import type { RequeteEtapeNote, UploadedFile } from '../../libs/prisma.js';
import requeteEtapesNotesChangelogMiddleware from './changelog.requeteEtapeNote.middleware.js';

vi.mock('../../features/changelog/changelog.service.js', () => ({
  createChangeLog: vi.fn(),
}));

vi.mock('../../features/notes/notes.service.js', () => ({
  getNoteById: vi.fn(),
}));

describe('changelog.requeteEtapeNote.middleware.ts', () => {
  const mockCreateChangeLog = vi.mocked(createChangeLog);
  const mockGetNoteById = vi.mocked(getNoteById);

  const testRequeteEtapeNote: RequeteEtapeNote & { uploadedFiles: UploadedFile[] } = {
    id: 'note-1',
    texte: 'Initial note content',
    authorId: 'author-1',
    requeteEtapeId: 're-1',
    uploadedFiles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  const createRequeteEtapeNoteTestAppWithParams = () => {
    const app = appWithAuth
      .createApp()
      .use((c, next) => {
        const logger = {
          warn: vi.fn(),
        };
        c.set('logger', logger as unknown as PinoLogger);
        return next();
      })
      .use((c, next) => {
        c.set('userId', 'user123');
        return next();
      })
      .patch('/:id', requeteEtapesNotesChangelogMiddleware({ action: ChangeLogAction.UPDATED }), async (c) => {
        return c.json({ ok: true });
      });

    return testClient(app);
  };

  const createRequeteEtapeNoteTestAppWithContext = () => {
    const app = appWithAuth
      .createApp()
      .use((c, next) => {
        const logger = {
          warn: vi.fn(),
        };
        c.set('logger', logger as unknown as PinoLogger);
        return next();
      })
      .use((c, next) => {
        c.set('userId', 'user123');
        return next();
      })
      .patch('/', requeteEtapesNotesChangelogMiddleware({ action: ChangeLogAction.CREATED }), async (c) => {
        c.set('changelogId', 'note-2');
        return c.json({ ok: true });
      });

    return testClient(app);
  };

  const createRequeteEtapeNoteTestWithNoId = () => {
    const app = appWithAuth
      .createApp()
      .use((c, next) => {
        const logger = {
          warn: vi.fn(),
        };
        c.set('logger', logger as unknown as PinoLogger);
        return next();
      })
      .use((c, next) => {
        c.set('userId', 'user123');
        return next();
      })
      .patch('/', requeteEtapesNotesChangelogMiddleware({ action: ChangeLogAction.CREATED }), async (c) => {
        return c.json({ ok: true });
      });

    return testClient(app);
  };

  describe('requeteEtapesNotesChangelogMiddleware', () => {
    it('should track changes to RequeteEtapeNote fields with params', async () => {
      const updatedRequeteEtapeNote = {
        ...testRequeteEtapeNote,
        texte: 'Updated note content',
        authorId: 'author-2',
      };

      mockGetNoteById.mockResolvedValueOnce(testRequeteEtapeNote).mockResolvedValueOnce(updatedRequeteEtapeNote);

      const app = createRequeteEtapeNoteTestAppWithParams();

      const response = await app[':id'].$patch({
        param: { id: 'note-1' },
      });

      expect(response.status).toBe(200);
      expect(mockGetNoteById).toHaveBeenCalledWith('note-1');
      expect(mockCreateChangeLog).toHaveBeenCalledWith({
        action: ChangeLogAction.UPDATED,
        entity: 'RequeteEtapeNote',
        entityId: 'note-1',
        changedById: 'user123',
        before: {
          texte: testRequeteEtapeNote.texte,
          authorId: testRequeteEtapeNote.authorId,
        },
        after: {
          texte: updatedRequeteEtapeNote.texte,
          authorId: updatedRequeteEtapeNote.authorId,
        },
      });
    });

    it('should track changes to RequeteEtapeNote fields with context', async () => {
      mockGetNoteById.mockResolvedValueOnce(testRequeteEtapeNote);

      const app = createRequeteEtapeNoteTestAppWithContext();

      await app.index.$patch();

      expect(mockGetNoteById).toHaveBeenCalledWith('note-2');
    });

    it('should handle entity not found', async () => {
      mockGetNoteById.mockResolvedValueOnce(null);

      const app = createRequeteEtapeNoteTestWithNoId();

      const response = await app.index.$patch({
        param: { id: 'non-existent-id' },
      });

      expect(response.status).toBe(200);
      expect(mockGetNoteById).not.toHaveBeenCalled();
      expect(mockCreateChangeLog).not.toHaveBeenCalled();
    });
  });
});
