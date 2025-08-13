import { Button } from '@codegouvfr/react-dsfr/Button';
import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import type { RequiredByKey } from '@sirena/common/utils';
import { useParams } from '@tanstack/react-router';
import { memo } from 'react';
import { StatusMenu } from '@/components/common/statusMenu';
import type { useAddProcessingStep } from '@/hooks/mutations/addProcessingStep.hook';
import { useUpdateProcessingStepStatus } from '@/hooks/mutations/updateProcessingStepStatus.hook';
import styles from '@/routes/_auth/_user/request.$requestId.module.css';

type Step = NonNullable<ReturnType<typeof useAddProcessingStep>['data']>['data'];

type StepProps = RequiredByKey<Step, 'stepName' | 'statutId' | 'id'> & {
  disabled?: boolean;
};

const StepComponent = ({ stepName, statutId, disabled, id }: StepProps) => {
  const { requestId } = useParams({ from: '/_auth/_user/request/$requestId' });
  const updateStatusMutation = useUpdateProcessingStepStatus(requestId);

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
        statutId: newStatutId as 'A_FAIRE' | 'EN_COURS' | 'FAIT',
      });
    }
  };

  return (
    <div className={`fr-mb-4w ${styles['timeline-step']}`}>
      <div className={styles['timeline-dot']} />
      <div className={styles.step}>
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
            >
              <span className="fr-sr-only">Éditer</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Step = memo(StepComponent);
