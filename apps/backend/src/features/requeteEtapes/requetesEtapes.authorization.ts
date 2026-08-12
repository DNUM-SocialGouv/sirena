import type { RequeteEtape, UploadedFile } from '../../libs/prisma.js';
import { isAutomaticAcknowledgment } from './requetesEtapes.permissions.js';

type AuthorizableRequeteEtape = Pick<
  RequeteEtape,
  'entiteId' | 'estPartagee' | 'type' | 'statutId' | 'acknowledgmentSendMode'
> & {
  uploadedFiles?: Pick<UploadedFile, 'canDelete' | 'uploadedById'>[];
};

const isOwner = (viewerEntiteId: string, step: AuthorizableRequeteEtape): boolean => viewerEntiteId === step.entiteId;

/** Common authorization policy for processing-step reads and writes. */
export const requeteEtapeAuthorization = {
  canRead: (viewerEntiteId: string, step: AuthorizableRequeteEtape, estPartageeEnabled = false): boolean =>
    isOwner(viewerEntiteId, step) || (estPartageeEnabled && step.estPartagee),
  canWrite: (viewerEntiteId: string, step: AuthorizableRequeteEtape): boolean =>
    isOwner(viewerEntiteId, step) &&
    !isAutomaticAcknowledgment({
      type: step.type,
      statutId: step.statutId,
      acknowledgmentSendMode: step.acknowledgmentSendMode,
      uploadedFiles: step.uploadedFiles ?? [],
    }),
};
