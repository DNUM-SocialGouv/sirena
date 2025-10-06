import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { REQUETE_STATUT_TYPES, type RequeteStatutType } from '@sirena/common/constants';
import { Toast } from '@sirena/ui';

import { clsx } from 'clsx';
import { memo, useState } from 'react';
import { ButtonLink } from '@/components/common/ButtonLink';
import { StatusMenu } from '@/components/common/statusMenu';
import { useDeleteProcessingStep, useUpdateProcessingStepStatus } from '@/hooks/mutations/updateProcessingStep.hook';
import { useUpdateProcessingStepName } from '@/hooks/mutations/updateProcessingStepName.hook';
import type { useProcessingSteps } from '@/hooks/queries/processingSteps.hook';
import styles from '@/routes/_auth/_user/request.$requestId.module.css';
import { UpdateProcessingStepNameSchema } from '@/schemas/processingSteps.schema';
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

const StepComponent = ({
  requestId,
  nom,
  statutId,
  disabled,
  openEdit,
  openEditNote,
  notes,
  id,
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

  const [isEditing, setIsEditing] = useState(false);
  const [editStepName, setEditStepName] = useState(nom ?? '');
  const [editError, setEditError] = useState<string | null>(null);

  const badges = [
    {
      type: 'success',
      text: 'Fait',
      value: REQUETE_STATUT_TYPES.FAIT,
    },
    {
      type: 'new',
      text: 'En cours',
      value: REQUETE_STATUT_TYPES.EN_COURS,
    },
    {
      type: 'info',
      text: 'À faire',
      value: REQUETE_STATUT_TYPES.A_FAIRE,
    },
  ];

  const handleStatusChange = (newStatutId: string) => {
    if (newStatutId !== statutId && id) {
      updateStatusMutation.mutate({
        id,
        statutId: newStatutId as RequeteStatutType,
      });
    }
  };

  const handleEditButton = (open: boolean) => {
    setIsEditing(open);
    setEditStepName(nom ?? '');
    setEditError(null);
  };

  const handleSaveEdit = () => {
    const validationResult = UpdateProcessingStepNameSchema.safeParse({
      stepName: editStepName,
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
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
                <ButtonLink icon="fr-icon-delete-line" onClick={() => deleteStepModal.open()}>
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
          <div className="fr-grid-row fr-grid-row--middle fr-mb-2w">
            <div className="fr-col">
              <h3 className="fr-h6 fr-mb-0">{nom ?? ''}</h3>
            </div>
            <div className="fr-col-auto" style={{ minWidth: 'fit-content', flexShrink: 0 }}>
              <StatusMenu
                badges={badges}
                value={statutId}
                disabled={disabled || updateStatusMutation.isPending}
                onBadgeClick={handleStatusChange}
              />
            </div>
            <div className="fr-col-auto" style={{ minWidth: 'fit-content', flexShrink: 0 }}>
              <Button
                priority="tertiary no outline"
                size="small"
                iconId="fr-icon-edit-line"
                title="Modifier le nom de l'étape"
                aria-label="Modifier le nom de l'étape"
                className="fr-btn--icon-center center-icon-with-sr-only"
                onClick={() => handleEditButton(true)}
                style={{ whiteSpace: 'nowrap' }}
              >
                <span className="fr-sr-only">Modifier le nom de l'étape</span>
              </Button>
            </div>
          </div>
        )}
      </div>
      <div className={styles['request-step']}>
        <div className={styles['request-notes']}>
          {notes.slice(0, isOpen ? notes.length : 3).map((note: StepType['notes'][number]) => (
            <StepNote
              key={note.id}
              content={note.texte}
              author={note.author}
              id={note.id}
              createdAt={note.createdAt}
              files={note.uploadedFiles.map((file: (typeof note.uploadedFiles)[number]) => ({
                id: file.id,
                size: file.size,
                originalName: (file.metadata as { originalName?: string })?.originalName || 'Unknown',
              }))}
              requeteStateId={id}
              onEdit={(noteData) => openEditNote?.({ id, nom, statutId, notes, ...rest }, noteData)}
            />
          ))}
        </div>
        <div className={styles['request-notes-distplay']}>
          {notes.length > 3 && (
            <button type="button" className="fr-btn-link" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? 'Masquer' : 'Afficher'} les notes précédentes{' '}
              <span
                className={clsx('fr-icon-arrow-down-s-line fr-btn-link__icon', isOpen && 'fr-btn-link__icon--is-open')}
              />
            </button>
          )}
        </div>
        <Button
          className={styles['request-step__add-note']}
          type="button"
          priority="tertiary"
          iconId="fr-icon-add-line"
          onClick={() => openEdit?.({ id, nom, statutId, notes, ...rest })}
        >
          Note ou fichier
        </Button>
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
