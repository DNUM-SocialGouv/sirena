import { testClient } from 'hono/testing';
import type { PinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChangeLog } from '@/features/changelog/changelog.service';
import { ChangeLogAction } from '@/features/changelog/changelog.type';
import { getNoteById } from '@/features/requeteStates/requeteStates.service';
import appWithAuth from '@/helpers/factories/appWithAuth';
import requeteStateNoteChangelogMiddleware from './changelog.requeteStateNote.middleware';

vi.mock('@/features/changelog/changelog.service', () => ({
  createChangeLog: vi.fn(),
}));

vi.mock('@/features/requeteStates/requeteStates.service', () => ({
  getNoteById: vi.fn(),
}));

describe('changelog.requeteStepNote.middleware.ts', () => {
  const mockCreateChangeLog = vi.mocked(createChangeLog);
  const mockGetNoteById = vi.mocked(getNoteById);

  const baseDate = new Date();

  const testNote = {
    id: 'note-1',
    createdAt: baseDate,
    updatedAt: baseDate,
    requeteEntiteStateId: 'rs-1',
    authorId: 'author-1',
    content: 'Initial content',
    uploadedFiles: [
      {
        id: 'file-1',
        fileName: 'a.txt',
        filePath: '/a.txt',
        mimeType: 'text/plain',
        size: 1,
        createdAt: baseDate,
        updatedAt: baseDate,
        status: 'READY',
        metadata: null,
        entiteId: null,
        uploadedById: 'author-1',
        requeteStateNoteId: 'note-1',
      },
    ],
  };

  const updatedNote = {
    ...testNote,
    content: 'Updated content',
    uploadedFiles: [
      ...testNote.uploadedFiles,
      {
        id: 'file-2',
        fileName: 'b.txt',
        filePath: '/b.txt',
        mimeType: 'text/plain',
        size: 2,
        createdAt: baseDate,
        updatedAt: baseDate,
        status: 'READY',
        metadata: null,
        entiteId: null,
        uploadedById: 'author-1',
        requeteStateNoteId: 'note-1',
      },
    ],
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  const createAppWithParams = () => {
    const app = appWithAuth
      .createApp()
      .use((c, next) => {
        const logger = { warn: vi.fn() };
        c.set('logger', logger as unknown as PinoLogger);
        return next();
      })
      .use((c, next) => {
        c.set('userId', 'user123');
        return next();
      })
      .patch('/:id', requeteStateNoteChangelogMiddleware({ action: ChangeLogAction.UPDATED }), async (c) =>
        c.json({ ok: true }),
      );

    return testClient(app);
  };

  const createAppWithContext = () => {
    const app = appWithAuth
      .createApp()
      .use((c, next) => {
        const logger = { warn: vi.fn() };
        c.set('logger', logger as unknown as PinoLogger);
        return next();
      })
      .use((c, next) => {
        c.set('userId', 'user123');
        return next();
      })
      .patch('/', requeteStateNoteChangelogMiddleware({ action: ChangeLogAction.CREATED }), async (c) => {
        c.set('changelogId', 'note-2');
        return c.json({ ok: true });
      });

    return testClient(app);
  };

  const createAppNoId = () => {
    const app = appWithAuth
      .createApp()
      .use((c, next) => {
        const logger = { warn: vi.fn() };
        c.set('logger', logger as unknown as PinoLogger);
        return next();
      })
      .use((c, next) => {
        c.set('userId', 'user123');
        return next();
      })
      .patch('/', requeteStateNoteChangelogMiddleware({ action: ChangeLogAction.CREATED }), async (c) =>
        c.json({ ok: true }),
      );

    return testClient(app);
  };

  describe('requeteStateNoteChangelogMiddleware', () => {
    it('tracks changes to RequeteStateNote with params', async () => {
      mockGetNoteById.mockResolvedValueOnce(testNote).mockResolvedValueOnce(updatedNote);

      const app = createAppWithParams();
      const res = await app[':id'].$patch({ param: { id: 'note-1' } });

      expect(res.status).toBe(200);
      expect(mockGetNoteById).toHaveBeenCalledWith('note-1');
      expect(mockCreateChangeLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: ChangeLogAction.UPDATED,
          entity: 'RequeteStateNote',
          entityId: 'note-1',
          changedById: 'user123',
          // Le middleware générique gère before/after. On valide partiellement.
          before: expect.any(Object),
          after: expect.any(Object),
        }),
      );
    });

    it('uses changelogId from context', async () => {
      mockGetNoteById.mockResolvedValueOnce(testNote);

      const app = createAppWithContext();
      await app.index.$patch();

      expect(mockGetNoteById).toHaveBeenCalledWith('note-2');
    });

    it('handles missing id (entity not found path)', async () => {
      mockGetNoteById.mockResolvedValueOnce(null);

      const app = createAppNoId();
      const res = await app.index.$patch({ param: { id: 'nope' } });

      expect(res.status).toBe(200);
      expect(mockGetNoteById).not.toHaveBeenCalled();
      expect(mockCreateChangeLog).not.toHaveBeenCalled();
    });
  });
});
