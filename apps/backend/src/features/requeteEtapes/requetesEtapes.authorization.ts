import { REQUETE_ETAPE_STATUT_TYPES, REQUETE_ETAPE_TYPES } from '@sirena/common/constants';
import { isAutomaticRequest } from '@sirena/common/utils';
import type { RequeteEtape, UploadedFile } from '../../libs/prisma.js';
import { getEtapePermissions } from './requetesEtapes.permissions.js';

type AuthorizableRequeteEtape = Pick<
  RequeteEtape,
  'entiteId' | 'estPartagee' | 'type' | 'statutId' | 'acknowledgmentSendMode'
> & {
  uploadedFiles?: Pick<UploadedFile, 'canDelete' | 'uploadedById'>[];
  requete?: {
    dematSocialId: number | null;
    sirecId: number | null;
    thirdPartyAccountId: string | null;
  };
};

const isOwner = (viewerEntiteId: string, step: AuthorizableRequeteEtape): boolean => viewerEntiteId === step.entiteId;

/** Common authorization policy for processing-step reads and writes. */
export const requeteEtapeAuthorization = {
  canRead: (viewerEntiteId: string, step: AuthorizableRequeteEtape, estPartageeEnabled = false): boolean =>
    isOwner(viewerEntiteId, step) || (estPartageeEnabled && step.estPartagee),
  canAddClotureFiles: (viewerEntiteId: string, step: AuthorizableRequeteEtape): boolean =>
    isOwner(viewerEntiteId, step) &&
    step.type === REQUETE_ETAPE_TYPES.MANUAL &&
    step.statutId === REQUETE_ETAPE_STATUT_TYPES.CLOTUREE,
  canWrite: (viewerEntiteId: string, step: AuthorizableRequeteEtape): boolean =>
    isOwner(viewerEntiteId, step) &&
    getEtapePermissions({
      type: step.type,
      statutId: step.statutId,
      acknowledgmentSendMode: step.acknowledgmentSendMode,
      requeteIsAutomatic: isAutomaticRequest(step.requete),
      uploadedFiles: step.uploadedFiles ?? [],
    }).editable,
};
