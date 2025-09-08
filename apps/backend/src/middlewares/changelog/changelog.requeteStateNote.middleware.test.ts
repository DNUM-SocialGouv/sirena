import { testClient } from 'hono/testing';
import type { PinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChangeLog } from '@/features/changelog/changelog.service';
import { ChangeLogAction } from '@/features/changelog/changelog.type';
import { getNoteById } from '@/features/requeteStates/requeteStates.service';
import appWithAuth from '@/helpers/factories/appWithAuth';
import requeteStatesNotesChangelogMiddleware from './changelog.requeteStateNote.middleware';

vi.mock('@/features/changelog/changelog.service', () => ({
  createChangeLog: vi.fn(),
}));

vi.mock('@/features/requeteStates/requeteStates.service', () => ({
  getNoteById: vi.fn(),
}));

describe('changelog.requeteStateNote.middleware.ts', () => {
  const mockCreateChangeLog = vi.mocked(createChangeLog);
  const mockGetNoteById = vi.mocked(getNoteById);

  const testRequeteStateNote = {
    id: 'note-1',
    content: 'Initial note content',
    authorId: 'author-1',
    requeteEntiteStateId: 'rs-1',
    uploadedFiles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  const createRequeteStateNoteTestAppWithParams = () => {
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
      .patch('/:id', requeteStatesNotesChangelogMiddleware({ action: ChangeLogAction.UPDATED }), async (c) => {
        return c.json({ ok: true });
      });

    return testClient(app);
  };

  const createRequeteStateNoteTestAppWithContext = () => {
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
      .patch('/', requeteStatesNotesChangelogMiddleware({ action: ChangeLogAction.CREATED }), async (c) => {
        c.set('changelogId', 'note-2');
        return c.json({ ok: true });
      });

    return testClient(app);
  };

  const createRequeteStateNoteTestWithNoId = () => {
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
      .patch('/', requeteStatesNotesChangelogMiddleware({ action: ChangeLogAction.CREATED }), async (c) => {
        return c.json({ ok: true });
      });

    return testClient(app);
  };

  describe('requeteStatesNotesChangelogMiddleware', () => {
    it('should track changes to RequeteStateNote fields with params', async () => {
      const updatedRequeteStateNote = {
        ...testRequeteStateNote,
        content: 'Updated note content',
        authorId: 'author-2',
      };

      mockGetNoteById.mockResolvedValueOnce(testRequeteStateNote).mockResolvedValueOnce(updatedRequeteStateNote);

      const app = createRequeteStateNoteTestAppWithParams();

      const response = await app[':id'].$patch({
        param: { id: 'note-1' },
      });

      expect(response.status).toBe(200);
      expect(mockGetNoteById).toHaveBeenCalledWith('note-1');
      expect(mockCreateChangeLog).toHaveBeenCalledWith({
        action: ChangeLogAction.UPDATED,
        entity: 'RequeteStateNote',
        entityId: 'note-1',
        changedById: 'user123',
        before: {
          content: testRequeteStateNote.content,
          authorId: testRequeteStateNote.authorId,
        },
        after: {
          content: updatedRequeteStateNote.content,
          authorId: updatedRequeteStateNote.authorId,
        },
      });
    });

    it('should track changes to RequeteStateNote fields with context', async () => {
      mockGetNoteById.mockResolvedValueOnce(testRequeteStateNote);

      const app = createRequeteStateNoteTestAppWithContext();

      await app.index.$patch();

      expect(mockGetNoteById).toHaveBeenCalledWith('note-2');
    });

    it('should handle entity not found', async () => {
      mockGetNoteById.mockResolvedValueOnce(null);

      const app = createRequeteStateNoteTestWithNoId();

      const response = await app.index.$patch({
        param: { id: 'non-existent-id' },
      });

      expect(response.status).toBe(200);
      expect(mockGetNoteById).not.toHaveBeenCalled();
      expect(mockCreateChangeLog).not.toHaveBeenCalled();
    });
  });
});
