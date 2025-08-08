import { Button } from '@codegouvfr/react-dsfr/Button';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { CreateStep } from '@/components/request/processing/createStep';
import { Step } from '@/components/request/processing/Step';
import { useProcessingSteps } from '@/hooks/queries/processingSteps.hook';
import styles from '@/routes/_auth/_user/request.$requestId.module.css';

export const Processing = () => {
  const { requestId } = useParams({ from: '/_auth/_user/request/$requestId' });
  const navigate = useNavigate();

  const [isAddingStep, setIsAddingStep] = useState(false);

  const queryProcessingSteps = useProcessingSteps(requestId);

  useEffect(() => {
    if (
      queryProcessingSteps.error &&
      'status' in queryProcessingSteps.error &&
      queryProcessingSteps.error.status === 404
    ) {
      navigate({ to: '/home' });
    }
  }, [queryProcessingSteps.error, navigate]);

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

                <CreateStep isAddingStep={isAddingStep} setIsAddingStep={setIsAddingStep} />

                <QueryStateHandler query={queryProcessingSteps}>
                  {({ data }) =>
                    data.data.map((step, index) => (
                      <Step key={step.id} {...step} disabled={index === data.data.length - 1} />
                    ))
                  }
                </QueryStateHandler>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
