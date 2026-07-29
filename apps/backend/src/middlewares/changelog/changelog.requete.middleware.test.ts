import { testClient } from 'hono/testing';
import type { PinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChangeLog } from '../../features/changelog/changelog.service.js';
import { ChangeLogAction } from '../../features/changelog/changelog.type.js';
import { getRequeteEntiteById } from '../../features/requetesEntite/requetesEntite.service.js';
import appWithChangelog from '../../helpers/factories/appWithChangeLog.js';
import type { PersonneConcernee } from '../../libs/prisma.js';
import requeteChangelogMiddleware from './changelog.requete.middleware.js';

vi.mock('../../features/changelog/changelog.service.js', () => ({
  createChangeLog: vi.fn(),
}));

vi.mock('../../features/requetesEntite/requetesEntite.service.js', () => ({
  getRequeteEntiteById: vi.fn(),
}));

describe('changelog.requete.middleware.ts', () => {
  const mockCreateChangeLog = vi.mocked(createChangeLog);
  const mockGetRequeteEntiteById = vi.mocked(getRequeteEntiteById);

  const testDeclarant = {
    id: 'declarant-1',
    estNonIdentifiee: false,
    estHandicapee: false,
    estIdentifie: true,
    estVictime: false,
    estVictimeInformee: null,
    victimeInformeeCommentaire: null,
    isTuteur: false,
    veutGarderAnonymat: false,
    estSignalementProfessionnel: null,
    commentaire: '',
    autrePersonnes: null,
    aAutrePersonnes: null,
    mesureProtection: null,
    ageId: null,
    dateNaissance: null,
    lienVictimeId: null,
    lienAutrePrecision: null,
    identite: null,
    adresse: null,
  } as unknown as PersonneConcernee;

  const asRequeteEntite = (declarant: PersonneConcernee) =>
    ({ requete: { id: 'requete-1', declarant, participant: null } }) as unknown as Awaited<
      ReturnType<typeof getRequeteEntiteById>
    >;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  const createTestApp = () => {
    const app = appWithChangelog
      .createApp()
      .use((c, next) => {
        c.set('logger', { error: vi.fn(), warn: vi.fn() } as unknown as PinoLogger);
        c.set('userId', 'user123');
        c.set('topEntiteId', 'entite-1');
        return next();
      })
      .patch('/:id/declarant', requeteChangelogMiddleware({ action: ChangeLogAction.UPDATED }), async (c) => {
        c.set('changelogId', 'declarant-1');
        return c.json({ ok: true });
      });

    return testClient(app);
  };

  it('should historize isTuteur when the declarant checkbox is checked', async () => {
    const declarantAfter = { ...testDeclarant, isTuteur: true } as PersonneConcernee;

    mockGetRequeteEntiteById
      .mockResolvedValueOnce(asRequeteEntite(testDeclarant))
      .mockResolvedValueOnce(asRequeteEntite(declarantAfter));

    const app = createTestApp();
    const response = await app[':id'].declarant.$patch({ param: { id: 'requete-1' } });

    expect(response.status).toBe(200);
    expect(mockCreateChangeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'PersonneConcernee',
        entityId: 'declarant-1',
        action: ChangeLogAction.UPDATED,
        changedById: 'user123',
        before: expect.objectContaining({ isTuteur: false }),
        after: expect.objectContaining({ isTuteur: true }),
      }),
    );
  });

  it('should historize isTuteur when it is the only changed field', async () => {
    const declarantAfter = { ...testDeclarant, isTuteur: true } as PersonneConcernee;

    mockGetRequeteEntiteById
      .mockResolvedValueOnce(asRequeteEntite(testDeclarant))
      .mockResolvedValueOnce(asRequeteEntite(declarantAfter));

    const app = createTestApp();
    await app[':id'].declarant.$patch({ param: { id: 'requete-1' } });

    expect(mockCreateChangeLog).toHaveBeenCalledTimes(1);
  });

  it('should not create a changelog when no tracked field changed', async () => {
    mockGetRequeteEntiteById
      .mockResolvedValueOnce(asRequeteEntite(testDeclarant))
      .mockResolvedValueOnce(asRequeteEntite(testDeclarant));

    const app = createTestApp();
    await app[':id'].declarant.$patch({ param: { id: 'requete-1' } });

    expect(mockCreateChangeLog).not.toHaveBeenCalled();
  });
});
