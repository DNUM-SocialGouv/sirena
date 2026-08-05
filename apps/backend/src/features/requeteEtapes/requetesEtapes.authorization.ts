import type { RequeteEtape } from '../../libs/prisma.js';

type AuthorizableRequeteEtape = Pick<RequeteEtape, 'entiteId' | 'estPartagee'>;

const isOwner = (viewerEntiteId: string, step: AuthorizableRequeteEtape): boolean => viewerEntiteId === step.entiteId;

/** Common authorization policy for processing-step reads and writes. */
export const requeteEtapeAuthorization = {
  canRead: (viewerEntiteId: string, step: AuthorizableRequeteEtape, estPartageeEnabled = false): boolean =>
    isOwner(viewerEntiteId, step) || (estPartageeEnabled && step.estPartagee),
  canWrite: (viewerEntiteId: string, step: AuthorizableRequeteEtape): boolean => isOwner(viewerEntiteId, step),
};
