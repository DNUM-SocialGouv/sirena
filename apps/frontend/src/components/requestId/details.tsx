import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { REQUETE_ETAPE_STATUT_TYPES, type ReceptionType } from '@sirena/common/constants';
import { useNavigate } from '@tanstack/react-router';
import { clsx } from 'clsx';
import { useId, useMemo } from 'react';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import type { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';
import { useCanEdit } from '@/hooks/useCanEdit';
import styles from './details.module.css';
import { DeclarantSection } from './sections/DeclarantSection';
import { OriginalRequestSection } from './sections/OriginalRequestSection';
import { PersonneConcerneeSection } from './sections/PersonneConcerneeSection';
import { RequeteFileUploadSection } from './sections/RequeteFileUploadSection';
import { SituationSection } from './sections/SituationSection';

interface DetailsProps {
  requestId?: string;
  requestQuery: ReturnType<typeof useRequeteDetails>;
}

export const Details = ({ requestId, requestQuery }: DetailsProps) => {
  const navigate = useNavigate();
  const declarantSectionId = useId();
  const personneSectionId = useId();
  const situationSectionId = useId();
  const { canEdit } = useCanEdit({ requeteId: requestId });

  const refetchRequest = () => {
    requestQuery.refetch();
  };

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
    return requestQuery.data?.requeteEtape?.some((etape) => etape.statutId === REQUETE_ETAPE_STATUT_TYPES.CLOTUREE);
  }, [requestQuery.data?.requeteEtape]);

  if (!requestId) {
    return (
      <div className={fr.cx('fr-container--fluid')}>
        <div className={clsx(fr.cx('fr-grid-row', 'fr-grid-row--gutters'), styles.detailsLayout)}>
          <div className={fr.cx('fr-col-md-12', 'fr-col-lg-4')}>
            <OriginalRequestSection requestId={requestId} />
            <RequeteFileUploadSection requeteId={requestId} mode="create" />
          </div>
          <div className={fr.cx('fr-col-md-12', 'fr-col-lg-8')}>
            <DeclarantSection requestId={requestId} id={declarantSectionId} onEdit={handleEditDeclarant} />
            <PersonneConcerneeSection
              requestId={requestId}
              id={personneSectionId}
              onEdit={handleEditPersonneConcernee}
            />
            <SituationSection
              id={situationSectionId}
              receptionType={null}
              requestId={requestId}
              onEdit={handleEditSituation}
            />
            {canEdit && (
              <div className="fr-mb-4w">
                <Button priority="secondary" iconId="fr-icon-add-line" onClick={() => handleEditSituation()}>
                  Ajouter une autre situation
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <QueryStateHandler query={requestQuery}>
      {({ data }) => {
        const declarant = data?.requete.declarant;
        const personne = data?.requete.participant;
        const situations = data?.requete.situations ?? [];
        const receptionTypeId = data?.requete.receptionTypeId as ReceptionType | undefined;
        const receptionDate = data?.requete.receptionDate;

        return (
          <div className={fr.cx('fr-container--fluid')}>
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
            <div className={clsx(fr.cx('fr-grid-row', 'fr-grid-row--gutters'), styles.detailsLayout)}>
              <div className={fr.cx('fr-col-md-12', 'fr-col-lg-4')}>
                <OriginalRequestSection
                  requestId={requestId}
                  data={{
                    receptionDate,
                    receptionTypeId,
                    dematSocialId: data?.requete.dematSocialId,
                    provenanceId: data?.requete.provenanceId ?? null,
                    provenancePrecision: data?.requete.provenancePrecision ?? null,
                  }}
                  updatedAt={data?.requete.updatedAt || null}
                  onEdit={() => refetchRequest()}
                />
                <RequeteFileUploadSection
                  requeteId={requestId}
                  mode="edit"
                  existingFiles={data?.requete?.fichiersRequeteOriginale || []}
                />
              </div>
              <div className={fr.cx('fr-col-md-12', 'fr-col-lg-8')}>
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
                  situations.map((situation) => (
                    <SituationSection
                      key={situation.id}
                      id={`situation-${situation.id}`}
                      receptionType={data?.requete.receptionTypeId || null}
                      requestId={requestId}
                      situation={situation}
                      onEdit={handleEditSituation}
                    />
                  ))
                ) : (
                  <SituationSection
                    receptionType={data?.requete.receptionTypeId || null}
                    id={situationSectionId}
                    requestId={requestId}
                    onEdit={handleEditSituation}
                  />
                )}
                {canEdit && (
                  <div className="fr-mb-4w">
                    <Button priority="secondary" iconId="fr-icon-add-line" onClick={() => handleEditSituation()}>
                      Ajouter une autre situation
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }}
    </QueryStateHandler>
  );
};
