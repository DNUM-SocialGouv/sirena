import { Button } from '@codegouvfr/react-dsfr/Button';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { CreateStep } from '@/components/requestId/processing/createStep';
import { Step } from '@/components/requestId/processing/Step';
import { useProcessingSteps } from '@/hooks/queries/processingSteps.hook';
import styles from '@/routes/_auth/_user/request.$requestId.module.css';
import { CreateNoteDrawer, type CreateNoteDrawerRef } from './processing/CreateNoteDrawer';
import { EditNoteDrawer, type EditNoteDrawerRef } from './processing/EditNoteDrawer';

type StepType = NonNullable<ReturnType<typeof useProcessingSteps>['data']>['data'][number];

export const Processing = () => {
  const { requestId } = useParams({ from: '/_auth/_user/request/$requestId' });
  const navigate = useNavigate();

  const [isAddingStep, setIsAddingStep] = useState(false);
  const createNoteDrawerRef = useRef<CreateNoteDrawerRef>(null);
  const editNoteDrawerRef = useRef<EditNoteDrawerRef>(null);
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

  const handleOpenEdit = (step: StepType) => {
    if (createNoteDrawerRef.current) {
      createNoteDrawerRef.current.openDrawer(step);
    }
  };

  const handleOpenEditNote = (
    step: StepType,
    noteData: {
      requeteStateId: string;
      id: string;
      content: string;
      files: {
        id: string;
        size: number;
        originalName: string;
      }[];
    },
  ) => {
    if (editNoteDrawerRef.current) {
      editNoteDrawerRef.current.openDrawer(step, noteData);
    }
  };

  return (
    <div>
      <CreateNoteDrawer ref={createNoteDrawerRef} />
      <EditNoteDrawer ref={editNoteDrawerRef} />
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
                    data.data.map((step) => (
                      <Step key={step.id} {...step} openEdit={handleOpenEdit} openEditNote={handleOpenEditNote} />
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
