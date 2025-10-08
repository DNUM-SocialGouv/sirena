import { useNavigate } from '@tanstack/react-router';
import { useId } from 'react';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';
import { DeclarantSection } from './sections/DeclarantSection';
import { PersonneConcerneeSection } from './sections/PersonneConcerneeSection';

interface DetailsProps {
  requestId?: string;
}

export const Details = ({ requestId }: DetailsProps) => {
  const navigate = useNavigate();
  const declarantSectionId = useId();
  const personneSectionId = useId();
  const requestQuery = useRequeteDetails(requestId);

  const handleEditDeclarant = () => {
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

  if (!requestId) {
    return (
      <>
        <DeclarantSection id={declarantSectionId} onEdit={handleEditDeclarant} />
        <PersonneConcerneeSection id={personneSectionId} onEdit={handleEditPersonneConcernee} />
      </>
    );
  }

  return (
    <QueryStateHandler query={requestQuery}>
      {() => {
        const declarant = requestQuery.data?.requete?.declarant;
        const personne = requestQuery.data?.requete?.participant;

        return (
          <>
            <DeclarantSection id={declarantSectionId} declarant={declarant} onEdit={handleEditDeclarant} />
            <PersonneConcerneeSection id={personneSectionId} personne={personne} onEdit={handleEditPersonneConcernee} />
          </>
        );
      }}
    </QueryStateHandler>
  );
};
