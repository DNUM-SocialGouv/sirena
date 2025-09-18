import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { useParams } from '@tanstack/react-router';
import { memo, useState } from 'react';
import { useAddProcessingStep } from '@/hooks/mutations/updateProcessingStep.hook';
import styles from '@/routes/_auth/_user/request.$requestId.module.css';

type CreateStepProps = {
  isAddingStep: boolean;
  setIsAddingStep: (val: boolean) => void;
};

const CreateStepComponent = ({ isAddingStep, setIsAddingStep }: CreateStepProps) => {
  const { requestId } = useParams({ from: '/_auth/_user/request/$requestId' });

  const [stepName, setStepName] = useState('');
  const [stepNameError, setStepNameError] = useState<string | null>();

  const addStepMutation = useAddProcessingStep(requestId);

  const handleCancel = () => {
    setIsAddingStep(false);
    setStepName('');
    setStepNameError(null);
  };

  const handleAddStep = () => {
    if (!stepName.trim()) {
      setStepNameError("Le champ 'Nom de l'étape' est obligatoire. Veuillez le renseigner pour ajouter une étape.");
      return;
    }
    addStepMutation.mutate(
      { nom: stepName.trim() },
      {
        onSuccess: () => {
          setIsAddingStep(false);
          setStepName('');
          setStepNameError(null);
        },
      },
    );
  };

  return (
    isAddingStep && (
      <div className={`fr-mb-4w ${styles['timeline-step']}`}>
        <div className={styles['timeline-dot']} />
        <div className={styles.step}>
          <div className="fr-mb-2w">
            <Input
              label="Nom de l'étape (obligatoire)"
              nativeInputProps={{
                value: stepName,
                onChange: (e) => {
                  setStepName(e.target.value);
                  setStepNameError(null);
                },
                placeholder: "Saisir le nom de l'étape",
              }}
              state={stepNameError ? 'error' : 'default'}
              stateRelatedMessage={stepNameError}
            />
          </div>
          <div className="fr-btns-group fr-btns-group--inline fr-grid-row--right">
            <Button priority="secondary" size="small" onClick={handleCancel} disabled={addStepMutation.isPending}>
              Annuler
            </Button>
            <Button priority="primary" size="small" onClick={handleAddStep} disabled={addStepMutation.isPending}>
              Ajouter
            </Button>
          </div>
        </div>
      </div>
    )
  );
};

export const CreateStep = memo(CreateStepComponent);
