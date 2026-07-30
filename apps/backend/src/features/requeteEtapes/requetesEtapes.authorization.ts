import type { RequeteEtape } from '../../libs/prisma.js';

type AuthorizableRequeteEtape = Pick<RequeteEtape, 'entiteId' | 'estPartagee'>;

const isOwner = (viewerEntiteId: string, step: AuthorizableRequeteEtape): boolean => viewerEntiteId === step.entiteId;

/**
 * Common authorization policy for processing-step reads and writes.
 * Sharing is deliberately ignored until the sharing behavior is introduced.
 */
export const requeteEtapeAuthorization = {
  canRead: (viewerEntiteId: string, step: AuthorizableRequeteEtape): boolean => isOwner(viewerEntiteId, step),
  canWrite: (viewerEntiteId: string, step: AuthorizableRequeteEtape): boolean => isOwner(viewerEntiteId, step),
};
