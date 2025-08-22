import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { REQUETE_STATUT_TYPES, type RequeteStatutType } from '@sirena/common/constants';
import { useParams } from '@tanstack/react-router';
import { memo, useState } from 'react';
import { StatusMenu } from '@/components/common/statusMenu';
import { useUpdateProcessingStepStatus } from '@/hooks/mutations/updateProcessingStep.hook';
import { useUpdateProcessingStepName } from '@/hooks/mutations/updateProcessingStepName.hook';
import type { useProcessingSteps } from '@/hooks/queries/processingSteps.hook';
import styles from '@/routes/_auth/_user/request.$requestId.module.css';
import { UpdateProcessingStepNameSchema } from '@/schemas/processingSteps.schema';
import { StepNote } from './StepNote';

type StepType = NonNullable<ReturnType<typeof useProcessingSteps>['data']>['data'][number];

type StepProps = StepType & {
  disabled?: boolean;
  openEdit?(step: StepType): void;
};

const StepComponent = ({ stepName, statutId, disabled, openEdit, notes, id, ...rest }: StepProps) => {
  const { requestId } = useParams({ from: '/_auth/_user/request/$requestId' });
  const updateStatusMutation = useUpdateProcessingStepStatus(requestId);
  const updateStepNameMutation = useUpdateProcessingStepName(requestId);

  const [isEditing, setIsEditing] = useState(false);
  const [editStepName, setEditStepName] = useState(stepName ?? '');
  const [editError, setEditError] = useState<string | null>(null);

  const badges = [
    {
      type: 'success',
      text: 'Fait',
      value: REQUETE_STATUT_TYPES.FAIT,
    },
    {
      type: 'warning',
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
    setEditStepName(stepName ?? '');
    setEditError(null);
  };

  const handleSaveEdit = () => {
    const validationResult = UpdateProcessingStepNameSchema.safeParse({ stepName: editStepName });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      setEditError(firstError.message);
      return;
    }

    updateStepNameMutation.mutate({
      id,
      stepName: validationResult.data.stepName,
    });

    setIsEditing(false);
    setEditError(null);
  };

  return (
    <div className={`fr-mb-4w ${styles['timeline-step']}`}>
      <div className={styles['timeline-dot']} />
      <div className={styles.step}>
        {isEditing ? (
          <div className="fr-mb-2w">
            <Input
              label="Nom de l'étape"
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
            <div className="fr-btns-group fr-btns-group--inline fr-grid-row--right fr-mt-2w">
              <Button priority="secondary" size="small" onClick={() => handleEditButton(false)}>
                Annuler
              </Button>
              <Button
                priority="primary"
                size="small"
                onClick={handleSaveEdit}
                disabled={updateStepNameMutation.isPending}
              >
                {updateStepNameMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="fr-grid-row fr-grid-row--middle fr-mb-2w">
            <div className="fr-col">
              <h3 className="fr-h6 fr-mb-0">{stepName ?? ''}</h3>
            </div>
            <div className="fr-col-auto">
              <StatusMenu
                badges={badges}
                value={statutId}
                disabled={disabled || updateStatusMutation.isPending}
                onBadgeClick={handleStatusChange}
              />
            </div>
            <div className="fr-col-auto">
              <Button
                priority="tertiary no outline"
                size="small"
                iconId="fr-icon-edit-line"
                title="Éditer"
                className="fr-btn--icon-center center-icon-with-sr-only"
                onClick={() => handleEditButton(true)}
              >
                <span className="fr-sr-only">Éditer</span>
              </Button>
            </div>
          </div>
        )}
        {notes.map((note) => (
          <StepNote
            key={note.id}
            content={note.content}
            author={note.author}
            id={note.id}
            createdAt={note.createdAt}
            files={note.uploadedFiles}
            requeteStateId={id}
          />
        ))}
        <Button
          type="button"
          priority="tertiary"
          iconId="fr-icon-add-line"
          onClick={() => openEdit?.({ id, stepName, statutId, notes, ...rest })}
        >
          Note ou fichier
        </Button>
      </div>
    </div>
  );
};

export const Step = memo(StepComponent);
