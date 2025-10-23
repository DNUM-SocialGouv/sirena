import { Button } from '@codegouvfr/react-dsfr/Button';
import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { CreateStep } from '@/components/requestId/processing/createStep';
import { Step } from '@/components/requestId/processing/Step';
import { useProcessingSteps } from '@/hooks/queries/processingSteps.hook';
import { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';
import { useCanEdit } from '@/hooks/useCanEdit';
import styles from '@/routes/_auth/_user/request.$requestId.module.css';
import { CloseRequeteModal, type CloseRequeteModalRef } from './processing/CloseRequeteModal';
import { CreateNoteDrawer, type CreateNoteDrawerRef } from './processing/CreateNoteDrawer';
import { EditNoteDrawer, type EditNoteDrawerRef } from './processing/EditNoteDrawer';

type StepType = NonNullable<ReturnType<typeof useProcessingSteps>['data']>['data'][number];
type NoteData = Parameters<EditNoteDrawerRef['openDrawer']>[1];

interface ProcessingProps {
  requestId?: string;
}

export const Processing = ({ requestId }: ProcessingProps = {}) => {
  const navigate = useNavigate();
  const [isAddingStep, setIsAddingStep] = useState(false);
  const createNoteDrawerRef = useRef<CreateNoteDrawerRef>(null);
  const editNoteDrawerRef = useRef<EditNoteDrawerRef>(null);
  const closeRequeteModalRef = useRef<CloseRequeteModalRef>(null);
  const queryProcessingSteps = useProcessingSteps(requestId || '');
  const requestQuery = useRequeteDetails(requestId);
  const { canEdit } = useCanEdit({ requeteId: requestId });

  useEffect(() => {
    if (
      requestId &&
      queryProcessingSteps.error &&
      'status' in queryProcessingSteps.error &&
      queryProcessingSteps.error.status === 404
    ) {
      navigate({ to: '/home' });
    }
  }, [queryProcessingSteps.error, navigate, requestId]);

  const handleOpenEdit = (step: StepType) => createNoteDrawerRef.current?.openDrawer(step);
  const handleOpenEditNote = (step: StepType, noteData: NoteData) =>
    editNoteDrawerRef.current?.openDrawer(step, noteData);
  const handleCloseRequete = () => closeRequeteModalRef.current?.openModal();

  const content = requestId ? (
    <>
      <div className={styles['timeline-container']}>
        <div className={styles['timeline-line']} />
        <CreateStep requestId={requestId} isAddingStep={isAddingStep} setIsAddingStep={setIsAddingStep} />
        <QueryStateHandler query={queryProcessingSteps}>
          {({ data }) =>
            data.data.map((step, index: number) => (
              <Step
                key={step.id}
                requestId={requestId}
                {...step}
                disabled={index === data.data.length - 1 || step.statutId === REQUETE_STATUT_TYPES.CLOTUREE}
                openEdit={handleOpenEdit}
                openEditNote={handleOpenEditNote}
              />
            ))
          }
        </QueryStateHandler>
      </div>
      <CreateNoteDrawer ref={createNoteDrawerRef} />
      <EditNoteDrawer ref={editNoteDrawerRef} />
      <CloseRequeteModal
        ref={closeRequeteModalRef}
        requestId={requestId}
        date={
          requestQuery.data?.requete?.createdAt
            ? new Date(requestQuery.data.requete.createdAt).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })
            : ''
        }
        misEnCause={
          requestQuery.data?.requete?.situations?.[0]?.misEnCause
            ? `${requestQuery.data.requete.situations[0].misEnCause.professionType?.label || ''} ${requestQuery.data.requete.situations[0].misEnCause.misEnCauseType?.label || ''}`.trim() ||
              'Non spécifié'
            : undefined
        }
      />
    </>
  ) : (
    <p className="fr-text--sm fr-text--grey">
      Les étapes de traitement seront disponibles après la création de la requête.
    </p>
  );

  return (
    <div>
      <div className="fr-container--fluid">
        <div className="fr-grid-row fr-grid-row--gutters">
          <div className="fr-col">
            <div className="fr-mb-4w">
              <div className="fr-grid-row fr-grid-row--middle fr-mb-3w">
                <div className="fr-col">
                  <h2 className="fr-mb-0">Étapes du traitement</h2>
                </div>
                {requestId && canEdit && (
                  <div className="fr-col-auto">
                    <Button className="fr-mr-2w" size="small" priority="primary" onClick={handleCloseRequete}>
                      Clôturer la requête
                    </Button>
                    <Button
                      priority="secondary"
                      size="small"
                      onClick={() => setIsAddingStep(true)}
                      disabled={isAddingStep}
                    >
                      Ajouter une étape
                    </Button>
                  </div>
                )}
              </div>
              {content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
