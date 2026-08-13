import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import {
  ACKNOWLEDGMENT_SEND_MODES,
  REQUETE_ETAPE_STATUT_TYPES,
  REQUETE_ETAPE_TYPES,
  ROLES,
  requeteEtapeStatutType,
} from '@sirena/common/constants';
import { isAutomaticRequest } from '@sirena/common/utils';
import { Toast } from '@sirena/ui';

import { clsx } from 'clsx';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { EntiteTypeBadge } from '@/components/common/EntiteTypeBadge';
import { FileDownloadLink } from '@/components/common/FileDownloadLink';
import { useDeleteUploadedFile } from '@/hooks/mutations/updateUploadedFiles.hook';
import type { useProcessingSteps } from '@/hooks/queries/processingSteps.hook';
import { useCanEdit } from '@/hooks/useCanEdit';
import { useModalFocusRestore } from '@/hooks/useModalFocusRestore';
import styles from '@/routes/_auth/_user/request.$requestId.module.css';
import { useUserStore } from '@/stores/userStore';
import { AddFilesClotureDrawer, type AddFilesClotureDrawerRef } from './AddFilesClotureDrawer';
import { StepFiles } from './StepFiles';
import { StepNote } from './StepNote';
import { formatAgent, formatDate } from './stepFormat';

type StepType = NonNullable<ReturnType<typeof useProcessingSteps>['data']>['data'][number];

type StepProps = StepType & {
  requestId: string;
  isOwner: boolean;
  isMultiEntite: boolean;
  isAcknowledgmentSendable?: boolean;
  onSendAcknowledgment?: () => void;
  openEdit?(step: StepType): void;
};

const formatStepCreationInfo = (
  createdBy: { prenom: string; nom: string } | null | undefined,
  createdAt: string,
  nomEntiteAdministrative?: string,
): React.ReactNode => {
  const date = formatDate(createdAt);
  const suffixeEntiteAdministrative = nomEntiteAdministrative ? ` (${nomEntiteAdministrative})` : '';
  if (createdBy) {
    return (
      <>
        Ajouté par {formatAgent(createdBy)}
        {suffixeEntiteAdministrative} le {date}
      </>
    );
  }
  return `Ajouté automatiquement${suffixeEntiteAdministrative} le ${date}`;
};

const getStepTitle = (type: string, statutId: string | null, nom: string | null): string => {
  if (statutId === REQUETE_ETAPE_STATUT_TYPES.CLOTUREE) return 'Clôture';
  if (type === REQUETE_ETAPE_TYPES.CREATION) return 'Création de la requête';
  if (type === REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT) return "Envoi de l'accusé de réception";
  if (type === REQUETE_ETAPE_TYPES.REOPEN) return 'Réouverture de la requête';
  return nom ?? '';
};

type StepSubtitleArgs = {
  type: string;
  statutId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: StepType['createdBy'];
  notes: StepType['notes'];
  requete: StepType['requete'];
  uploadedFiles: StepType['uploadedFiles'];
  acknowledgmentSendMode?: StepType['acknowledgmentSendMode'];
  clotureEffectiveDate?: string | null;
  dateRealisation?: string | Date | null;
  nomEntiteAdministrative?: string;
};

const getStepSubtitle = ({
  type,
  statutId,
  createdAt,
  updatedAt,
  createdBy,
  notes,
  requete,
  uploadedFiles,
  acknowledgmentSendMode,
  clotureEffectiveDate,
  dateRealisation,
  nomEntiteAdministrative,
}: StepSubtitleArgs): React.ReactNode => {
  const suffixeEntiteAdministrative = nomEntiteAdministrative ? ` (${nomEntiteAdministrative})` : '';
  if (statutId === REQUETE_ETAPE_STATUT_TYPES.CLOTUREE) {
    const agent = createdBy ?? notes[0]?.author;
    const closureDate = clotureEffectiveDate ?? createdAt;
    return agent ? (
      <>
        Requête clôturée le {formatDate(closureDate)} par {formatAgent(agent)}
        {suffixeEntiteAdministrative}
      </>
    ) : (
      `Requête clôturée le ${formatDate(closureDate)}${suffixeEntiteAdministrative}`
    );
  }
  if (type === REQUETE_ETAPE_TYPES.CREATION) {
    // An ingested request (DematSocial, SIREC, third-party API) was created automatically.
    if (isAutomaticRequest(requete)) {
      return `Fait automatiquement${suffixeEntiteAdministrative} le ${formatDate(createdAt)}`;
    }
    // Otherwise the request was created manually; the author agent may be missing if the account was deleted.
    return requete?.createdBy ? (
      <>
        Requête créée le {formatDate(createdAt)} par {formatAgent(requete.createdBy)}
        {suffixeEntiteAdministrative}
      </>
    ) : (
      `Requête créée le ${formatDate(createdAt)}${suffixeEntiteAdministrative}`
    );
  }
  if (type === REQUETE_ETAPE_TYPES.REOPEN) {
    return createdBy ? (
      <>
        Requête réouverte le {formatDate(createdAt)} par {formatAgent(createdBy)}
        {suffixeEntiteAdministrative}
      </>
    ) : (
      `Requête réouverte le ${formatDate(createdAt)}${suffixeEntiteAdministrative}`
    );
  }
  if (type === REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT) {
    if (statutId === REQUETE_ETAPE_STATUT_TYPES.FAIT) {
      const arFile = uploadedFiles.find((file) => !file.canDelete);
      if (acknowledgmentSendMode === ACKNOWLEDGMENT_SEND_MODES.AUTOMATIC) {
        return `Envoyé automatiquement${suffixeEntiteAdministrative} le ${formatDate(dateRealisation ?? updatedAt)}`;
      }
      if (arFile?.uploadedBy) {
        return (
          <>
            Envoyé le {formatDate(arFile.createdAt)} par {formatAgent(arFile.uploadedBy)}
            {suffixeEntiteAdministrative}
          </>
        );
      }
      if (acknowledgmentSendMode === ACKNOWLEDGMENT_SEND_MODES.MANUAL) {
        return `Envoyé${suffixeEntiteAdministrative} le ${formatDate(dateRealisation ?? updatedAt)}`;
      }
      if (arFile) {
        return `Envoyé automatiquement${suffixeEntiteAdministrative} le ${formatDate(arFile.createdAt)}`;
      }
      if (isAutomaticRequest(requete)) {
        return `Envoyé automatiquement${suffixeEntiteAdministrative} le ${formatDate(updatedAt)}`;
      }
      return `Marqué comme fait${suffixeEntiteAdministrative} le ${formatDate(updatedAt)}`;
    }
    return `Ajouté automatiquement${suffixeEntiteAdministrative} le ${formatDate(createdAt)}`;
  }
  return (
    <>
      {formatStepCreationInfo(createdBy, createdAt, nomEntiteAdministrative)}
      {statutId === REQUETE_ETAPE_STATUT_TYPES.FAIT && dateRealisation ? (
        <>
          {' '}
          <span aria-hidden="true">•</span> Fait le {formatDate(dateRealisation)}
        </>
      ) : null}
    </>
  );
};

type ClotureFileItemProps = {
  file: StepType['uploadedFiles'][number];
  stepId: string;
  canEdit: boolean;
  onRequestDelete: (fileId: string, fileName: string) => void;
};

const ClotureFileItem = ({ file, stepId, canEdit, onRequestDelete }: ClotureFileItemProps) => {
  const fileName = file.fileName;

  const handleDelete = useCallback(() => {
    onRequestDelete(file.id, fileName);
  }, [onRequestDelete, file.id, fileName]);

  return (
    <li className={styles['request-note__file']}>
      <FileDownloadLink
        href={`/api/requete-etapes/${stepId}/file/${file.id}`}
        safeHref={`/api/requete-etapes/${stepId}/file/${file.id}/safe`}
        fileName={fileName}
        fileId={file.id}
        fileSize={file.size}
        status={file.status}
        scanStatus={file.scanStatus}
        sanitizeStatus={file.sanitizeStatus}
      />
      {canEdit ? (
        <Button
          aria-label={`Supprimer le fichier ${fileName}`}
          title="Supprimer le fichier"
          type="button"
          className={fr.cx('fr-btn', 'fr-btn--sm', 'fr-btn--tertiary', 'fr-icon-delete-line')}
          onClick={handleDelete}
        >
          <span className={fr.cx('fr-sr-only')}>Supprimer le fichier</span>
        </Button>
      ) : null}
    </li>
  );
};

type StepEditButtonProps = {
  className?: string;
  step: StepType;
  onEdit?(step: StepType): void;
};

const StepEditButton = ({ className, step, onEdit }: StepEditButtonProps) => {
  const handleClick = useCallback(() => {
    onEdit?.(step);
  }, [onEdit, step]);

  return (
    <Button className={className} type="button" priority="tertiary" iconId="fr-icon-edit-line" onClick={handleClick}>
      Modifier l'étape
    </Button>
  );
};

const StepComponent = ({
  requestId,
  isOwner,
  isMultiEntite,
  nom,
  createdBy,
  createdAt,
  updatedAt,
  statutId,
  isAcknowledgmentSendable,
  onSendAcknowledgment,
  openEdit,
  notes,
  id,
  requete,
  clotureEffectiveDate,
  entiteAdministrative,
  timelineItemType,
  attributedEntiteAdministrative,
  ...step
}: StepProps) => {
  const deleteClotureFileModal = useMemo(
    () =>
      createModal({
        id: `delete-cloture-file-modal-${id}`,
        isOpenedByDefault: false,
      }),
    [id],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deletedFileIds, setDeletedFileIds] = useState<Set<string>>(new Set());
  const deleteFileMutation = useDeleteUploadedFile({ requeteId: requestId });
  const toastManager = Toast.useToastManager();
  useModalFocusRestore([deleteClotureFileModal.id]);
  const addFilesClotureDrawerRef = useRef<AddFilesClotureDrawerRef>(null);

  const { canEdit } = useCanEdit({ requeteId: requestId });
  const userRole = useUserStore((s) => s.role);
  const canWrite = userRole
    ? ([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER] as string[]).includes(userRole)
    : false;

  const showAFaireBadge = statutId === REQUETE_ETAPE_STATUT_TYPES.A_FAIRE;
  const canEditStep = canEdit && step.editable;
  const isNeutralEvent = timelineItemType === 'NEUTRAL_EVENT';
  const entityRelation = isMultiEntite ? (isNeutralEvent ? 'neutral' : isOwner ? 'owner' : 'foreign') : undefined;
  const nomEntiteAdministrative =
    isMultiEntite && !isNeutralEvent ? attributedEntiteAdministrative?.nomComplet : undefined;

  // Legacy notes that only held files show up empty once the files were moved to the step level; hide them.
  const visibleNotes = notes.filter((note) => note.texte?.trim());

  const clotureReasonLabels =
    statutId === REQUETE_ETAPE_STATUT_TYPES.CLOTUREE
      ? step.clotureReason.map((reason) => reason.label).filter(Boolean)
      : [];

  const handleConfirmDeleteClotureFile = async () => {
    if (!fileToDelete) return;
    try {
      await deleteFileMutation.mutateAsync(fileToDelete.id);
      setDeletedFileIds((prev) => new Set([...prev, fileToDelete.id]));
      toastManager.add({
        title: 'Fichier supprimé avec succès',
        description: 'Le fichier a bien été supprimé.',
        data: { icon: 'fr-alert--success' },
      });
    } catch {
      toastManager.add({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression du fichier.',
        data: { icon: 'fr-alert--error' },
      });
    } finally {
      deleteClotureFileModal.close();
      setFileToDelete(null);
    }
  };

  const handleRequestDeleteClotureFile = useCallback(
    (fileId: string, fileName: string) => {
      setFileToDelete({ id: fileId, name: fileName });
      deleteClotureFileModal.open();
    },
    [deleteClotureFileModal],
  );

  const handleToggleNotes = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const handleAddClotureFile = useCallback(() => {
    addFilesClotureDrawerRef.current?.openDrawer();
  }, []);

  return (
    <div
      className={clsx(
        'fr-mb-4w',
        styles['timeline-step'],
        entityRelation && styles[`timeline-step--${entityRelation}`],
      )}
      data-entity-relation={entityRelation}
      data-timeline-item-type={timelineItemType}
    >
      <div className={styles['timeline-dot']} data-testid="timeline-dot" aria-hidden="true" />
      <div className={styles.step}>
        <div className="fr-mb-1w">
          <div className="fr-grid-row fr-grid-row--middle">
            <div className="fr-col" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {isMultiEntite && attributedEntiteAdministrative ? (
                <EntiteTypeBadge
                  entiteTypeId={attributedEntiteAdministrative.entiteTypeId}
                  label={attributedEntiteAdministrative.entiteTypeId}
                  relation={entityRelation}
                  className="fr-mb-0"
                  aria-hidden="true"
                />
              ) : null}
              <h3 className="fr-h6 fr-mb-0">
                {isMultiEntite && attributedEntiteAdministrative ? (
                  <>
                    <span className="fr-sr-only">{attributedEntiteAdministrative.entiteTypeId} -</span>{' '}
                  </>
                ) : null}
                {getStepTitle(step.type, statutId, nom)}
              </h3>
              {showAFaireBadge && (
                <p className="fr-badge fr-badge--no-icon fr-badge--sm fr-badge--info fr-mb-0">
                  {requeteEtapeStatutType.A_FAIRE}
                </p>
              )}
            </div>
          </div>
          <div className="fr-grid-row fr-grid-row--middle fr-mt-1w">
            <div className="fr-col">
              <p className="fr-text--xs fr-text-mention--grey">
                {getStepSubtitle({
                  type: step.type,
                  statutId,
                  createdAt,
                  updatedAt,
                  createdBy,
                  notes,
                  requete,
                  uploadedFiles: step.uploadedFiles,
                  acknowledgmentSendMode: step.acknowledgmentSendMode,
                  clotureEffectiveDate,
                  dateRealisation: step.dateRealisation,
                  nomEntiteAdministrative,
                })}
              </p>
              {isAcknowledgmentSendable && canEdit ? (
                <div className="fr-mt-2w">
                  <Button priority="secondary" size="small" onClick={onSendAcknowledgment}>
                    Envoyer
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div className={styles['request-step']}>
        {statutId === REQUETE_ETAPE_STATUT_TYPES.CLOTUREE ? (
          <>
            <div className={styles['cloture-block']}>
              {clotureReasonLabels.length > 0 && (
                <div>
                  <p className={styles['cloture-block__label']}>Raisons de la clôture :</p>
                  {clotureReasonLabels.map((label) => (
                    <p key={label} className={styles['cloture-block__reason']}>
                      {label}
                    </p>
                  ))}
                </div>
              )}
              {notes[0]?.texte ? (
                <div className="fr-mt-2w">
                  <p className={styles['cloture-block__label']}>Précisions :</p>
                  <p className={styles['cloture-block__precision']}>{notes[0].texte}</p>
                </div>
              ) : null}
            </div>
            {step.uploadedFiles && step.uploadedFiles.filter((f) => !deletedFileIds.has(f.id)).length > 0 && (
              <ul className={`fr-mt-1w ${styles['cloture-files']}`}>
                {step.uploadedFiles
                  .filter((f) => !deletedFileIds.has(f.id))
                  .map((file: StepType['uploadedFiles'][number]) => (
                    <ClotureFileItem
                      key={file.id}
                      file={file}
                      stepId={id}
                      canEdit={isOwner && canEdit}
                      onRequestDelete={handleRequestDeleteClotureFile}
                    />
                  ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <div className={styles['request-notes']}>
              {visibleNotes.slice(0, isOpen ? visibleNotes.length : 3).map((note: StepType['notes'][number]) => (
                <StepNote key={note.id} content={note.texte} author={note.author} createdAt={note.createdAt} />
              ))}
            </div>
            <div className={styles['request-notes-distplay']}>
              {visibleNotes.length > 3 && (
                <button type="button" className="fr-btn-link" onClick={handleToggleNotes}>
                  {isOpen ? 'Masquer' : 'Afficher'} les notes précédentes{' '}
                  <span
                    className={clsx(
                      'fr-icon-arrow-down-s-line fr-btn-link__icon',
                      isOpen && 'fr-btn-link__icon--is-open',
                    )}
                  />
                </button>
              )}
            </div>
            <StepFiles files={step.uploadedFiles} stepId={id} />
            {canEditStep ? (
              <StepEditButton
                className={styles['request-step__add-note']}
                step={{
                  id,
                  nom,
                  statutId,
                  notes,
                  createdAt,
                  updatedAt,
                  createdBy,
                  requete,
                  clotureEffectiveDate,
                  entiteAdministrative,
                  ...step,
                }}
                onEdit={openEdit}
              />
            ) : null}
          </>
        )}
        {statutId === REQUETE_ETAPE_STATUT_TYPES.CLOTUREE && isOwner && canWrite && (
          <>
            <Button
              className={styles['request-step__add-note']}
              type="button"
              priority="tertiary"
              iconId="fr-icon-add-line"
              onClick={handleAddClotureFile}
            >
              Ajouter un fichier
            </Button>
            <AddFilesClotureDrawer ref={addFilesClotureDrawerRef} stepId={id} />
          </>
        )}
      </div>

      <deleteClotureFileModal.Component
        concealingBackdrop={false}
        title="Supprimer le fichier"
        buttons={[
          {
            doClosesModal: true,
            children: 'Annuler',
            onClick: () => {
              deleteClotureFileModal.close();
              setFileToDelete(null);
            },
          },
          {
            doClosesModal: false,
            children: 'Confirmer',
            onClick: handleConfirmDeleteClotureFile,
          },
        ]}
      >
        <p>Êtes-vous sûr de vouloir supprimer le fichier "{fileToDelete?.name}" ? Cette action est irréversible.</p>
      </deleteClotureFileModal.Component>
    </div>
  );
};

export const Step = memo(StepComponent);
