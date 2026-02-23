import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { REQUETE_STATUT_TYPES, type ReceptionType } from '@sirena/common/constants';
import { Link } from '@tanstack/react-router';
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
  const declarantSectionId = useId();
  const personneSectionId = useId();
  const situationSectionId = useId();
  const { canEdit } = useCanEdit({ requeteId: requestId });

  const refetchRequest = () => {
    requestQuery.refetch();
  };

  const editDeclarantHref = canEdit
    ? requestId
      ? `/request/${requestId}/declarant`
      : `/request/create/declarant`
    : undefined;

  const editPersonneHref = canEdit
    ? requestId
      ? `/request/${requestId}/personne-concernee`
      : `/request/create/personne-concernee`
    : undefined;

  const getEditSituationHref = (situationId?: string): string => {
    if (requestId) {
      if (situationId) {
        return `/request/${requestId}/situation/${situationId}`;
      }
      return `/request/${requestId}/situation`;
    }

    return '/request/create/situation';
  };

  const isRequestClosed = useMemo(() => {
    return requestQuery.data?.statutId === REQUETE_STATUT_TYPES.CLOTUREE;
  }, [requestQuery.data?.statutId]);

  if (!requestId) {
    return (
      <div className={fr.cx('fr-container--fluid')}>
        <div className={clsx(fr.cx('fr-grid-row', 'fr-grid-row--gutters'), styles.detailsLayout)}>
          <div className={fr.cx('fr-col-md-12', 'fr-col-lg-4')}>
            <OriginalRequestSection requestId={requestId} />
            <RequeteFileUploadSection requeteId={requestId} mode="create" />
          </div>
          <div className={fr.cx('fr-col-md-12', 'fr-col-lg-8')}>
            <DeclarantSection requestId={requestId} id={declarantSectionId} editHref={editDeclarantHref} />
            <PersonneConcerneeSection requestId={requestId} id={personneSectionId} editHref={editPersonneHref} />
            <SituationSection
              id={situationSectionId}
              receptionType={null}
              requestId={requestId}
              editHref={getEditSituationHref()}
            />
            {canEdit && (
              <div className="fr-mb-4w">
                <Link to={getEditSituationHref()} className="fr-btn--secondary fr-icon-add-line">
                  Ajouter une autre situation
                </Link>
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
                  editHref={editDeclarantHref}
                />
                <PersonneConcerneeSection
                  requestId={requestId}
                  id={personneSectionId}
                  personne={personne}
                  editHref={editPersonneHref}
                />
                {situations.length > 0 ? (
                  situations.map((situation) => (
                    <SituationSection
                      key={situation.id}
                      id={`situation-${situation.id}`}
                      receptionType={data?.requete.receptionTypeId || null}
                      requestId={requestId}
                      situation={situation}
                      editHref={getEditSituationHref(situation.id)}
                    />
                  ))
                ) : (
                  <SituationSection
                    receptionType={data?.requete.receptionTypeId || null}
                    id={situationSectionId}
                    requestId={requestId}
                    editHref={getEditSituationHref()}
                  />
                )}
                {canEdit && (
                  <div className="fr-mb-4w">
                    <Link
                      to={getEditSituationHref()}
                      className="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-add-line"
                    >
                      Ajouter une autre situation
                    </Link>
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
