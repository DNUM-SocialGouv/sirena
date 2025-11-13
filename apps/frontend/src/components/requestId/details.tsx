import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { useNavigate } from '@tanstack/react-router';
import { useId, useMemo } from 'react';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';
import { useCanEdit } from '@/hooks/useCanEdit';
import { DeclarantSection } from './sections/DeclarantSection';
import { PersonneConcerneeSection } from './sections/PersonneConcerneeSection';
import { RequeteFileUploadSection } from './sections/RequeteFileUploadSection';
import { SituationSection } from './sections/SituationSection';

interface DetailsProps {
  requestId?: string;
}

export const Details = ({ requestId }: DetailsProps) => {
  const navigate = useNavigate();
  const declarantSectionId = useId();
  const personneSectionId = useId();
  const situationSectionId = useId();
  const requestQuery = useRequeteDetails(requestId);
  const { canEdit } = useCanEdit({ requeteId: requestId });

  const handleEditDeclarant = () => {
    if (!canEdit) return;
    if (requestId) {
      navigate({ to: '/request/$requestId/declarant', params: { requestId } });
    } else {
      navigate({ to: '/request/create/declarant' });
    }
  };

  const handleEditPersonneConcernee = () => {
    if (requestId) {
      navigate({ to: '/request/$requestId/personne-concernee', params: { requestId } });
    } else {
      navigate({ to: '/request/create/personne-concernee' });
    }
  };

  const handleEditSituation = (situationId?: string) => {
    if (requestId) {
      if (situationId) {
        navigate({
          to: '/request/$requestId/situation/$situationId',
          params: { requestId, situationId },
        });
      } else {
        navigate({
          to: '/request/$requestId/situation',
          params: { requestId },
        });
      }
    } else {
      navigate({ to: '/request/create/situation' });
    }
  };

  const isRequestClosed = useMemo(() => {
    return requestQuery.data?.requeteEtape?.some((etape) => etape.statutId === REQUETE_STATUT_TYPES.CLOTUREE);
  }, [requestQuery.data?.requeteEtape]);

  if (!requestId) {
    return (
      <>
        <DeclarantSection requestId={requestId} id={declarantSectionId} onEdit={handleEditDeclarant} />
        <PersonneConcerneeSection requestId={requestId} id={personneSectionId} onEdit={handleEditPersonneConcernee} />
        <SituationSection id={situationSectionId} requestId={requestId} onEdit={handleEditSituation} />
        <RequeteFileUploadSection requeteId={requestId} mode="create" />
      </>
    );
  }

  return (
    <QueryStateHandler query={requestQuery}>
      {() => {
        const declarant = requestQuery.data?.requete?.declarant;
        const personne = requestQuery.data?.requete?.participant;
        const situations = requestQuery.data?.requete?.situations ?? [];

        return (
          <>
            <div>
              {requestId && !canEdit && (
                <Alert
                  severity={isRequestClosed ? 'warning' : 'info'}
                  title=""
                  description={
                    isRequestClosed
                      ? 'Accès en lecture seule : cette requête est clôturée et ne peut plus être modifiée.'
                      : "Accès en lecture seule : l'édition n'est pas disponible avec vos autorisations actuelles."
                  }
                  className="fr-mb-3w"
                />
              )}
            </div>
            <DeclarantSection
              requestId={requestId}
              id={declarantSectionId}
              declarant={declarant}
              onEdit={handleEditDeclarant}
            />
            <PersonneConcerneeSection
              requestId={requestId}
              id={personneSectionId}
              personne={personne}
              onEdit={handleEditPersonneConcernee}
            />
            {situations.length > 0 ? (
              <>
                {situations.map((situation) => (
                  <SituationSection
                    key={situation.id}
                    id={`situation-${situation.id}`}
                    requestId={requestId}
                    situation={situation}
                    onEdit={handleEditSituation}
                  />
                ))}
                {canEdit && (
                  <div className="fr-mb-4w">
                    <Button priority="secondary" iconId="fr-icon-add-line" onClick={() => handleEditSituation()}>
                      Ajouter un lieu, mis en cause, faits
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <SituationSection id={situationSectionId} requestId={requestId} onEdit={handleEditSituation} />
            )}
            <RequeteFileUploadSection
              requeteId={requestId}
              mode="edit"
              existingFiles={requestQuery.data?.requete?.fichiersRequeteOriginale || []}
            />
          </>
        );
      }}
    </QueryStateHandler>
  );
};
