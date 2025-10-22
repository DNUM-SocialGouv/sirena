import { useNavigate } from '@tanstack/react-router';
import { useId } from 'react';
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
  const { canEdit } = useCanEdit();

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

  const handleEditSituation = () => {
    if (requestId) {
      navigate({ to: '/request/$requestId/situation', params: { requestId } });
    } else {
      navigate({ to: '/request/create/situation' });
    }
  };

  if (!requestId) {
    return (
      <>
        <DeclarantSection id={declarantSectionId} onEdit={handleEditDeclarant} />
        <PersonneConcerneeSection id={personneSectionId} onEdit={handleEditPersonneConcernee} />
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
        const [situation] = requestQuery.data?.requete?.situations ?? [];

        return (
          <>
            <DeclarantSection id={declarantSectionId} declarant={declarant} onEdit={handleEditDeclarant} />
            <PersonneConcerneeSection id={personneSectionId} personne={personne} onEdit={handleEditPersonneConcernee} />
            <SituationSection
              id={situationSectionId}
              requestId={requestId}
              situation={situation}
              onEdit={handleEditSituation}
            />
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
