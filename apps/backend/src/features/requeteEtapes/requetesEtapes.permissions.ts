import {
  ACKNOWLEDGMENT_SEND_MODES,
  type AcknowledgmentSendMode,
  REQUETE_ETAPE_STATUT_TYPES,
  REQUETE_ETAPE_TYPES,
} from '@sirena/common/constants';

export type EtapePermissionInput = {
  type: string;
  statutId: string | null;
  acknowledgmentSendMode?: AcknowledgmentSendMode | null;
  requeteIsAutomatic?: boolean;
  uploadedFiles: { canDelete: boolean; uploadedById?: string | null; uploadedBy?: unknown | null }[];
};

const getAcknowledgmentPdf = (etape: EtapePermissionInput) => etape.uploadedFiles.find((file) => !file.canDelete);

export const isAutomaticAcknowledgment = (etape: EtapePermissionInput): boolean => {
  if (etape.type !== REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT) return false;
  if (etape.acknowledgmentSendMode === ACKNOWLEDGMENT_SEND_MODES.AUTOMATIC) return true;
  if (etape.acknowledgmentSendMode !== null && etape.acknowledgmentSendMode !== undefined) return false;
  if (etape.requeteIsAutomatic === true && etape.statutId === REQUETE_ETAPE_STATUT_TYPES.A_FAIRE) return true;

  const acknowledgmentPdf = getAcknowledgmentPdf(etape);
  const uploadedBySystem =
    acknowledgmentPdf?.uploadedById === null ||
    (Object.hasOwn(acknowledgmentPdf ?? {}, 'uploadedBy') && acknowledgmentPdf?.uploadedBy === null);
  return uploadedBySystem && etape.requeteIsAutomatic === true && etape.statutId === REQUETE_ETAPE_STATUT_TYPES.FAIT;
};

export const getEtapePermissions = (etape: EtapePermissionInput): { editable: boolean; canOnlyEditNotes: boolean } => {
  if (etape.statutId === REQUETE_ETAPE_STATUT_TYPES.CLOTUREE) {
    return { editable: false, canOnlyEditNotes: false };
  }

  if (
    etape.type === REQUETE_ETAPE_TYPES.CREATION ||
    etape.type === REQUETE_ETAPE_TYPES.REOPEN ||
    etape.type === REQUETE_ETAPE_TYPES.ASSIGNMENT
  ) {
    return { editable: false, canOnlyEditNotes: false };
  }

  if (etape.type !== REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT) {
    return { editable: true, canOnlyEditNotes: false };
  }

  if (isAutomaticAcknowledgment(etape)) {
    return { editable: false, canOnlyEditNotes: false };
  }

  if (etape.acknowledgmentSendMode === ACKNOWLEDGMENT_SEND_MODES.MANUAL) {
    return { editable: true, canOnlyEditNotes: etape.statutId === REQUETE_ETAPE_STATUT_TYPES.FAIT };
  }

  return { editable: true, canOnlyEditNotes: getAcknowledgmentPdf(etape) !== undefined };
};
