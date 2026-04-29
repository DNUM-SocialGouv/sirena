import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import {
  REQUETE_ETAPE_STATUT_TYPES,
  REQUETE_ETAPE_TYPES,
  type RequeteEtapeStatutType,
  ROLES,
} from '@sirena/common/constants';
import { Toast } from '@sirena/ui';

import { clsx } from 'clsx';
import { memo, useRef, useState } from 'react';
import { ButtonLink } from '@/components/common/ButtonLink';
import { FileDownloadLink } from '@/components/common/FileDownloadLink';
import { StatusMenu } from '@/components/common/statusMenu';
import { capitalizeFirst } from '@/components/requestId/sections/helpers';
import { useDeleteProcessingStep, useUpdateProcessingStepStatus } from '@/hooks/mutations/updateProcessingStep.hook';
import { useUpdateProcessingStepName } from '@/hooks/mutations/updateProcessingStepName.hook';
import type { useProcessingSteps } from '@/hooks/queries/processingSteps.hook';
import { useCanEdit } from '@/hooks/useCanEdit';
import { useModalFocusRestore } from '@/hooks/useModalFocusRestore';
import styles from '@/routes/_auth/_user/request.$requestId.module.css';
import { UpdateProcessingStepNameSchema } from '@/schemas/processingSteps.schema';
import { useUserStore } from '@/stores/userStore';
import { requeteEtapeStatutBadges } from '@/utils/requeteStatutBadge.constant';
import { AddFilesClotureDrawer, type AddFilesClotureDrawerRef } from './AddFilesClotureDrawer';
import { StepNote } from './StepNote';

type StepType = NonNullable<ReturnType<typeof useProcessingSteps>['data']>['data'][number];

type StepProps = StepType & {
  requestId: string;
  disabled?: boolean;
  openEdit?(step: StepType): void;
  openEditNote?(
    step: StepType,
    noteData: {
      content: string;
      files: { id: string; size: number; originalName: string }[];
    },
  ): void;
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const formatAgent = (agent: { prenom: string; nom: string }): React.ReactNode => (
  <>
    {capitalizeFirst(agent.prenom)} <span className="lastname">{capitalizeFirst(agent.nom)}</span>
  </>
);

const formatStepCreationInfo = (
  createdBy: { prenom: string; nom: string } | null | undefined,
  createdAt: string,
): React.ReactNode => {
  const date = formatDate(createdAt);
  if (createdBy) {
    return (
      <>
        Ajouté par {formatAgent(createdBy)} le {date}
      </>
    );
  }
  return `Ajouté automatiquement le ${date}`;
};

const getStepTitle = (type: string, statutId: string, nom: string | null): string => {
  if (statutId === REQUETE_ETAPE_STATUT_TYPES.CLOTUREE) return 'Clôture';
  if (type === REQUETE_ETAPE_TYPES.CREATION) return 'Création de la requête';
  if (type === REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT) return "Envoi de l'accusé de réception";
  return nom ?? '';
};

type RequeteRef =
  | {
      createdBy: { prenom: string; nom: string } | null;
      dematSocialId: number | null;
      thirdPartyAccountId: string | null;
    }
  | null
  | undefined;

const getStepSubtitle = (
  type: string,
  statutId: string,
  createdAt: string,
  createdBy: { prenom: string; nom: string } | null | undefined,
  requete: RequeteRef,
  clotureNoteAuthor?: { prenom: string; nom: string } | null,
): React.ReactNode => {
  const date = formatDate(createdAt);

  if (statutId === REQUETE_ETAPE_STATUT_TYPES.CLOTUREE) {
    const agent = createdBy ?? clotureNoteAuthor;
    if (agent) {
      return (
        <>
          Requête clôturée le {date} par {formatAgent(agent)}
        </>
      );
    }
    return `Requête clôturée le ${date}`;
  }

  if (type === REQUETE_ETAPE_TYPES.CREATION) {
    const isManual =
      requete?.dematSocialId == null && requete?.thirdPartyAccountId == null && requete?.createdBy != null;
    if (isManual && requete?.createdBy) {
      return (
        <>
          Requête créée le {date} par {formatAgent(requete.createdBy)}
        </>
      );
    }
    return `Requête créée le ${date}`;
  }

  if (type === REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT) {
    const isManual =
      requete?.dematSocialId == null && requete?.thirdPartyAccountId == null && requete?.createdBy != null;
    return isManual ? `Envoyé automatiquement le ${date}` : `Ajouté automatiquement le ${date}`;
  }

  return formatStepCreationInfo(createdBy, createdAt);
};

const StepComponent = ({
  requestId,
  nom,
  createdBy,
  createdAt,
  statutId,
  disabled,
  openEdit,
  openEditNote,
  notes,
  id,
  requete,
  ...rest
}: StepProps) => {
  const deleteStepModal = createModal({
    id: `delete-step-modal-${id}`,
    isOpenedByDefault: false,
  });
  const [isOpen, setIsOpen] = useState(false);
  const updateStatusMutation = useUpdateProcessingStepStatus(requestId);
  const updateStepNameMutation = useUpdateProcessingStepName(requestId);
  const deleteStepMutation = useDeleteProcessingStep(requestId);
  const toastManager = Toast.useToastManager();
  const { registerTrigger } = useModalFocusRestore([deleteStepModal.id]);
  const addFilesClotureDrawerRef = useRef<AddFilesClotureDrawerRef>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editStepName, setEditStepName] = useState(nom ?? '');
  const [editError, setEditError] = useState<string | null>(null);
  const { canEdit } = useCanEdit({ requeteId: requestId });
  const userRole = useUserStore((s) => s.role);
  const canWrite = userRole
    ? ([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.WRITER] as string[]).includes(userRole)
    : false;

  const isSystemStep = rest.type !== REQUETE_ETAPE_TYPES.MANUAL || statutId === REQUETE_ETAPE_STATUT_TYPES.CLOTUREE;
  const isAutomaticAcknowledgment = rest.type === REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT && createdBy === null;

  const badges = requeteEtapeStatutBadges.filter((badge) => {
    if (statutId === REQUETE_ETAPE_STATUT_TYPES.CLOTUREE) {
      return true;
    }
    return badge.value !== REQUETE_ETAPE_STATUT_TYPES.CLOTUREE;
  });

  const handleStatusChange = (newStatutId: string) => {
    if (newStatutId !== statutId && id && newStatutId !== 'CLOTUREE') {
      updateStatusMutation.mutate({
        id,
        statutId: newStatutId as Exclude<RequeteEtapeStatutType, 'CLOTUREE'>,
      });
    }
  };

  const handleEditButton = (open: boolean) => {
    setIsEditing(open);
    setEditStepName(nom ?? '');
    setEditError(null);
  };

  const clotureReasonLabels =
    statutId === REQUETE_ETAPE_STATUT_TYPES.CLOTUREE
      ? rest.clotureReason.map((reason) => reason.label).filter(Boolean)
      : [];

  const handleSaveEdit = () => {
    const validationResult = UpdateProcessingStepNameSchema.safeParse({
      stepName: editStepName,
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      setEditError(firstError.message);
      return;
    }

    updateStepNameMutation.mutate({
      id,
      nom: validationResult.data.stepName,
    });

    setIsEditing(false);
    setEditError(null);
  };

  const handleDeleteStep = async () => {
    if (id) {
      deleteStepMutation.mutate(
        { id },
        {
          onSuccess: () => {
            deleteStepModal.close();
            toastManager.add({
              title: 'Étape supprimée',
              description: "L'étape a été supprimée avec succès.",
              timeout: 0,
              data: { icon: 'fr-alert--success' },
            });
          },
        },
      );
    }
  };

  const handleDeleteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    registerTrigger(e.currentTarget);
    deleteStepModal.open();
  };

  return (
    <div className={`fr-mb-4w ${styles['timeline-step']}`}>
      <div className={styles['timeline-dot']} />
      <div className={styles.step}>
        {isEditing ? (
          <div className="fr-mb-2w">
            <Input
              label="Nom de l'étape (obligatoire)"
              nativeInputProps={{
                value: editStepName,
                onChange: (e) => {
                  setEditStepName(e.target.value);
                  setEditError(null);
                },
                placeholder: "Saisir le nom de l'étape",
              }}
              state={editError ? 'error' : 'default'}
              stateRelatedMessage={editError}
            />
            <div className="fr-grid-row fr-grid-row--middle fr-mt-2w">
              <div className="fr-col">
                <ButtonLink icon="fr-icon-delete-line" onClick={handleDeleteClick}>
                  Supprimer l'étape
                </ButtonLink>
              </div>
              <div className="fr-col-auto" style={{ minWidth: 'fit-content', flexShrink: 0 }}>
                <div className="fr-btns-group fr-btns-group--inline">
                  <Button priority="secondary" size="small" onClick={() => handleEditButton(false)}>
                    Annuler
                  </Button>
                  <Button
                    priority="primary"
                    size="small"
                    onClick={handleSaveEdit}
                    disabled={updateStepNameMutation.isPending}
                  >
                    {updateStepNameMutation.isPending ? 'Enregistrement...' : 'Modifier'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="fr-mb-2w">
            <div className="fr-grid-row fr-grid-row--middle">
              <div className="fr-col">
                <h3 className="fr-h6 fr-mb-0">{getStepTitle(rest.type, statutId, nom)}</h3>
              </div>
              <div className="fr-col-auto" style={{ minWidth: 'fit-content', flexShrink: 0 }}>
                <StatusMenu
                  badges={badges}
                  value={statutId === REQUETE_ETAPE_STATUT_TYPES.CLOTUREE ? REQUETE_ETAPE_STATUT_TYPES.FAIT : statutId}
                  disabled={disabled || !canEdit || updateStatusMutation.isPending}
                  onBadgeClick={handleStatusChange}
                />
              </div>
              <div className="fr-col-auto" style={{ minWidth: 'fit-content', flexShrink: 0 }}>
                {canEdit && !isSystemStep && (
                  <Button
                    priority="tertiary no outline"
                    size="small"
                    iconId="fr-icon-edit-line"
                    title={`Modifier le nom de l'étape ${getStepTitle(rest.type, statutId, nom)}`}
                    aria-label="Modifier le nom de l'étape"
                    className="fr-btn--icon-center center-icon-with-sr-only"
                    onClick={() => handleEditButton(true)}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <span className="fr-sr-only">
                      Modifier le nom de l'étape {getStepTitle(rest.type, statutId, nom)}
                    </span>
                  </Button>
                )}
              </div>
            </div>
            <div>
              <p className="fr-text--xs fr-text-mention--grey">
                {getStepSubtitle(rest.type, statutId, createdAt, createdBy, requete, notes[0]?.author)}
              </p>
              {isAutomaticAcknowledgment && notes[0]?.uploadedFiles && notes[0].uploadedFiles.length > 0 && (
                <ul className="fr-mt-1w">
                  {notes[0].uploadedFiles.map((file: StepType['notes'][number]['uploadedFiles'][number]) => (
                    <li key={file.id} className={styles['request-note__file']}>
                      <FileDownloadLink
                        href={`/api/requete-etapes/${id}/file/${file.id}`}
                        safeHref={`/api/requete-etapes/${id}/file/${file.id}/safe`}
                        fileName={(file.metadata as { originalName?: string })?.originalName || 'Unknown'}
                        fileId={file.id}
                        fileSize={file.size}
                        status={file.status}
                        scanStatus={file.scanStatus}
                        sanitizeStatus={file.sanitizeStatus}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
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
              {notes[0]?.texte && (
                <div className="fr-mt-2w">
                  <p className={styles['cloture-block__label']}>Précisions :</p>
                  <p className={styles['cloture-block__precision']}>{notes[0].texte}</p>
                </div>
              )}
            </div>
            {notes[0]?.uploadedFiles && notes[0].uploadedFiles.length > 0 && (
              <ul className="fr-mt-1w">
                {notes[0].uploadedFiles.map((file: (typeof notes)[number]['uploadedFiles'][number]) => (
                  <li key={file.id} className={styles['request-note__file']}>
                    <FileDownloadLink
                      href={`/api/requete-etapes/${id}/file/${file.id}`}
                      safeHref={`/api/requete-etapes/${id}/file/${file.id}/safe`}
                      fileName={(file.metadata as { originalName?: string })?.originalName || 'Unknown'}
                      fileId={file.id}
                      fileSize={file.size}
                      status={file.status}
                      scanStatus={file.scanStatus}
                      sanitizeStatus={file.sanitizeStatus}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <div className={styles['request-notes']}>
              {!isAutomaticAcknowledgment &&
                notes.slice(0, isOpen ? notes.length : 3).map((note: StepType['notes'][number]) => (
                  <StepNote
                    requestId={requestId}
                    key={note.id}
                    content={note.texte}
                    author={note.author}
                    id={note.id}
                    createdAt={note.createdAt}
                    files={note.uploadedFiles.map((file: (typeof note.uploadedFiles)[number]) => ({
                      id: file.id,
                      size: file.size,
                      originalName: (file.metadata as { originalName?: string })?.originalName || 'Unknown',
                      status: file.status,
                      scanStatus: file.scanStatus,
                      sanitizeStatus: file.sanitizeStatus,
                      safeFilePath: file.safeFilePath,
                    }))}
                    requeteStateId={id}
                    onEdit={(noteData) =>
                      openEditNote?.(
                        {
                          id,
                          nom,
                          statutId,
                          notes,
                          createdAt,
                          createdBy,
                          requete,
                          ...rest,
                        },
                        noteData,
                      )
                    }
                    clotureReasonLabels={null}
                  />
                ))}
            </div>
            <div className={styles['request-notes-distplay']}>
              {notes.length > 3 && (
                <button type="button" className="fr-btn-link" onClick={() => setIsOpen(!isOpen)}>
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
            {canEdit && !isSystemStep && (
              <Button
                className={styles['request-step__add-note']}
                type="button"
                priority="tertiary"
                iconId="fr-icon-add-line"
                onClick={() =>
                  openEdit?.({
                    id,
                    nom,
                    statutId,
                    notes,
                    createdAt,
                    createdBy,
                    requete,
                    ...rest,
                  })
                }
              >
                Ajouter une note ou un fichier
              </Button>
            )}
          </>
        )}
        {statutId === REQUETE_ETAPE_STATUT_TYPES.CLOTUREE && canWrite && notes[0] && (
          <>
            <Button
              className={styles['request-step__add-note']}
              type="button"
              priority="tertiary"
              iconId="fr-icon-add-line"
              onClick={() => addFilesClotureDrawerRef.current?.openDrawer()}
            >
              Ajouter un fichier
            </Button>
            <AddFilesClotureDrawer ref={addFilesClotureDrawerRef} noteId={notes[0].id} noteTexte={notes[0].texte} />
          </>
        )}
      </div>

      <deleteStepModal.Component
        title="Suppression d'une étape"
        buttons={[
          {
            doClosesModal: true,
            children: 'Annuler',
          },
          {
            doClosesModal: false,
            children: 'Supprimer',
            onClick: handleDeleteStep,
          },
        ]}
      >
        <p>
          Êtes-vous sûr de vouloir supprimer cette étape ? La suppression de l'étape entraîne la suppression de toutes
          les notes et fichiers liés à cette étape.
        </p>
      </deleteStepModal.Component>
    </div>
  );
};

export const Step = memo(StepComponent);
