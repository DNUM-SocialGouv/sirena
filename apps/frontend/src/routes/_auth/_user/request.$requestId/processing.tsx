import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useAddProcessingStep } from '@/hooks/mutations/addProcessingStep.hook';
import { useProcessingSteps } from '@/hooks/queries/processingSteps.hook';
import styles from '../request.$requestId.module.css';

export const Route = createFileRoute('/_auth/_user/request/$requestId/processing')({
  component: RouteComponent,
});

function RouteComponent() {
  const params = Route.useParams();
  const requestId = typeof (params as any)?.requestId === 'string' ? (params as any).requestId : '';

  if (!requestId) {
    return <div>Request ID not found</div>;
  }
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [stepName, setStepName] = useState('');
  const [stepNameError, setStepNameError] = useState<string | undefined>();

  const { data: steps = [] } = useProcessingSteps(requestId);

  const addStepMutation = useAddProcessingStep(requestId);

  const handleAddStep = () => {
    if (!stepName.trim()) {
      setStepNameError("Le champ 'Nom de l'étape' est obligatoire. Veuillez le renseigner pour ajouter une étape.");
      return;
    }
    addStepMutation.mutate(
      { stepName: stepName.trim() },
      {
        onSuccess: () => {
          setIsAddingStep(false);
          setStepName('');
          setStepNameError(undefined);
        },
      },
    );
  };

  const handleCancel = () => {
    setIsAddingStep(false);
    setStepName('');
    setStepNameError(undefined);
  };

  return (
    <div className={styles['request-processing-tab']}>
      <div className="fr-container--fluid">
        <div className="fr-grid-row fr-grid-row--gutters">
          <div className="fr-col">
            <div className="fr-mb-4w">
              <div className="fr-grid-row fr-grid-row--middle fr-mb-3w">
                <div className="fr-col">
                  <h2 className="fr-mb-0">Étapes du traitement</h2>
                </div>
                <div className="fr-col-auto">
                  <Button
                    priority="secondary"
                    size="small"
                    onClick={() => setIsAddingStep(true)}
                    disabled={isAddingStep}
                  >
                    Ajouter une étape
                  </Button>
                </div>
              </div>

              <div className={styles['timeline-container']}>
                <div className={styles['timeline-line']} />

                {isAddingStep && (
                  <div className={`fr-mb-4w ${styles['timeline-step']}`}>
                    <div className={styles['timeline-dot']} />
                    <div className={styles.step}>
                      <div className="fr-mb-2w">
                        <Input
                          label="Nom de l'étape"
                          nativeInputProps={{
                            value: stepName,
                            onChange: (e) => {
                              setStepName(e.target.value);
                              setStepNameError(undefined);
                            },
                            placeholder: "Saisir le nom de l'étape",
                          }}
                          state={stepNameError ? 'error' : 'default'}
                          stateRelatedMessage={stepNameError}
                        />
                      </div>
                      <div className="fr-btns-group fr-btns-group--inline">
                        <Button
                          priority="secondary"
                          size="small"
                          onClick={handleCancel}
                          disabled={addStepMutation.isPending}
                        >
                          Annuler
                        </Button>
                        <Button
                          priority="primary"
                          size="small"
                          onClick={handleAddStep}
                          disabled={addStepMutation.isPending}
                        >
                          Ajouter
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {steps
                  .filter((step) => step.stepName)
                  .map((step) => (
                    <div key={step.id} className={`fr-mb-4w ${styles['timeline-step']}`}>
                      <div className={styles['timeline-dot']} />
                      <div className={styles.step}>
                        <div className="fr-grid-row fr-grid-row--middle fr-mb-2w">
                          <div className="fr-col">
                            <h3 className="fr-h6 fr-mb-0">{step.stepName || 'Untitled Step'}</h3>
                          </div>
                          <div className="fr-col-auto">
                            <Badge severity={step.stepStatus === 'FAIT' ? 'warning' : 'success'} small>
                              {step.stepStatus === 'A_FAIRE' ? 'À FAIRE' : step.stepStatus || 'A_FAIRE'}
                            </Badge>
                          </div>
                          <div className="fr-col-auto">
                            <Button
                              priority="tertiary no outline"
                              size="small"
                              iconId="fr-icon-arrow-down-s-line"
                              iconPosition="right"
                              title="Afficher/Masquer"
                            >
                              <span className="fr-sr-only">Afficher/Masquer</span>
                            </Button>
                          </div>
                          <div className="fr-col-auto">
                            <Button
                              priority="tertiary no outline"
                              size="small"
                              iconId="fr-icon-edit-line"
                              title="Éditer"
                            >
                              <span className="fr-sr-only">Éditer</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                <div className={`fr-mb-4w ${styles['timeline-step']}`}>
                  <div className={styles['timeline-dot']} />

                  <div className={styles.step}>
                    <div className="fr-grid-row fr-grid-row--middle fr-mb-2w">
                      <div className="fr-col">
                        <h3 className="fr-h6 fr-mb-0">Création de la requête le x/x/x</h3>
                      </div>
                      <div className="fr-col-auto">
                        <Badge severity="warning" small>
                          FAIT
                        </Badge>
                      </div>
                      <div className="fr-col-auto">
                        <Button
                          priority="tertiary no outline"
                          size="small"
                          iconId="fr-icon-arrow-down-s-line"
                          iconPosition="right"
                          title="Afficher/Masquer"
                        >
                          <span className="fr-sr-only">Afficher/Masquer</span>
                        </Button>
                      </div>
                      <div className="fr-col-auto">
                        <Button priority="tertiary no outline" size="small" iconId="fr-icon-edit-line" title="Éditer">
                          <span className="fr-sr-only">Éditer</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
