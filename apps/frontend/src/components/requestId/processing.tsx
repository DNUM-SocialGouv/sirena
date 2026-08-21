import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { SegmentedControl, type SegmentedControlProps } from '@codegouvfr/react-dsfr/SegmentedControl';
import { REQUETE_ETAPE_STATUT_TYPES, REQUETE_ETAPE_TYPES, REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { EntiteTypeBadge } from '@/components/common/EntiteTypeBadge';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { Step } from '@/components/requestId/processing/Step';
import { useProcessingSteps } from '@/hooks/queries/processingSteps.hook';
import { type useRequeteDetails, useRequeteOtherEntitiesAffected } from '@/hooks/queries/useRequeteDetails';
import { useCanEdit } from '@/hooks/useCanEdit';
import styles from '@/routes/_auth/_user/request.$requestId.module.css';
import { CloseRequeteModal, type CloseRequeteModalRef } from './processing/CloseRequeteModal';
import { ReopenRequeteModal, type ReopenRequeteModalRef } from './processing/ReopenRequeteModal';
import { SendAcknowledgmentDrawer, type SendAcknowledgmentDrawerRef } from './processing/SendAcknowledgmentDrawer';
import { StepFormPanel, type StepFormPanelRef } from './processing/StepFormPanel';
import { OtherEntitiesAffected } from './sections/OtherEntitesAffected';

type StepType = NonNullable<ReturnType<typeof useProcessingSteps>['data']>['data'][number];

interface ProcessingProps {
  requestId?: string;
  requestQuery: ReturnType<typeof useRequeteDetails>;
}

export const Processing = ({ requestId, requestQuery }: ProcessingProps) => {
  const navigate = useNavigate();
  const stepFormPanelRef = useRef<StepFormPanelRef>(null);
  const sendAcknowledgmentDrawerRef = useRef<SendAcknowledgmentDrawerRef>(null);
  const closeRequeteModalRef = useRef<CloseRequeteModalRef>(null);
  const closeRequeteButtonRef = useRef<HTMLButtonElement>(null);
  const reopenRequeteModalRef = useRef<ReopenRequeteModalRef>(null);
  const reopenRequeteButtonRef = useRef<HTMLButtonElement>(null);
  const queryProcessingSteps = useProcessingSteps(requestId || '');
  const { canEdit, hasEditRole } = useCanEdit({ requeteId: requestId });
  const { data: { otherEntites = [], subAdministrativeEntites = [] } = {} } =
    useRequeteOtherEntitiesAffected(requestId);

  const isRequestClosed = requestQuery.data?.statutId === REQUETE_STATUT_TYPES.CLOTUREE;

  const isEntityFilterVisible = Boolean(
    requestId &&
      requestQuery.data &&
      queryProcessingSteps.data?.meta.isMultiEntite &&
      queryProcessingSteps.data.meta.etapePartageeEnabled,
  );

  const otherEntitiesById = new Map(otherEntites.map((entity) => [entity.id, entity]));

  if (requestQuery.data) {
    otherEntitiesById.delete(requestQuery.data.entiteId);
  }

  const entityFilterOptions = requestQuery.data
    ? [
        {
          id: requestQuery.data.entiteId,
          entiteTypeId: requestQuery.data.entite.entiteTypeId,
          nomComplet: requestQuery.data.entite.nomComplet,
        },
        ...[...otherEntitiesById.values()].sort((left, right) => left.nomComplet.localeCompare(right.nomComplet, 'fr')),
      ]
    : [];

  const entityFilterSegments = [
    {
      label: 'Toutes les entités',
      nativeInputProps: { value: '', defaultChecked: true },
    },
    ...entityFilterOptions.map((entity) => ({
      label: (
        <span className={styles['entity-filter-option']}>
          <EntiteTypeBadge
            as="span"
            entiteTypeId={entity.entiteTypeId}
            label={entity.entiteTypeId}
            relation={entity.id === requestQuery.data?.entiteId ? 'owner' : 'foreign'}
            className="fr-mb-0"
          />
          <span>{entity.nomComplet}</span>
        </span>
      ),
      nativeInputProps: { value: entity.id, 'aria-label': `${entity.entiteTypeId} ${entity.nomComplet}` },
    })),
  ] as SegmentedControlProps.Segments;

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

  const handleOpenEdit = (step: StepType) => {
    stepFormPanelRef.current?.openEdit(step);
  };
  const handleCloseRequete = () => closeRequeteModalRef.current?.openModal();
  const handleReopenRequete = () => reopenRequeteModalRef.current?.openModal();
  const handleOpenCreate = () => stepFormPanelRef.current?.openCreate();

  const content = requestId ? (
    <>
      <div className={styles['timeline-container']}>
        <div className={styles['timeline-line']} data-testid="timeline-line" aria-hidden="true" />
        <QueryStateHandler query={queryProcessingSteps}>
          {({ data }) => {
            const isManualRequest = !!requestQuery.data?.requete?.createdById;
            const isMultiEntite = Boolean(data.meta.isMultiEntite && data.meta.etapePartageeEnabled);

            return data.data.map((step) => {
              const isAcknowledgmentSendable =
                isManualRequest &&
                step.type === REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT &&
                step.statutId === REQUETE_ETAPE_STATUT_TYPES.A_FAIRE &&
                step.editable;
              return (
                <Step
                  key={step.id}
                  requestId={requestId}
                  isOwner={step.attributedEntiteAdministrative?.id === requestQuery.data?.entiteId}
                  isMultiEntite={isMultiEntite}
                  {...step}
                  isAcknowledgmentSendable={isAcknowledgmentSendable}
                  onSendAcknowledgment={
                    isAcknowledgmentSendable ? () => sendAcknowledgmentDrawerRef.current?.openDrawer(step) : undefined
                  }
                  openEdit={handleOpenEdit}
                />
              );
            });
          }}
        </QueryStateHandler>
      </div>
      <StepFormPanel ref={stepFormPanelRef} requestId={requestId} />
      <SendAcknowledgmentDrawer ref={sendAcknowledgmentDrawerRef} />
      <CloseRequeteModal ref={closeRequeteModalRef} requestId={requestId} triggerButtonRef={closeRequeteButtonRef} />
      <ReopenRequeteModal ref={reopenRequeteModalRef} requestId={requestId} triggerButtonRef={reopenRequeteButtonRef} />
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
          <div className="fr-col-md-12 fr-col-lg-8 ">
            <div className="fr-mb-4w">
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
              <div className="fr-grid-row fr-grid-row--middle fr-mb-3w">
                <div
                  className="fr-col"
                  style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}
                >
                  <h2 className="fr-mb-0 fr-text--xl">Étapes de traitement</h2>
                  {requestQuery.data ? (
                    <>
                      <EntiteTypeBadge
                        entiteTypeId={requestQuery.data.entite.entiteTypeId}
                        label={requestQuery.data.entite.nomComplet}
                        className="fr-mb-0"
                      />
                      {subAdministrativeEntites.map((entite) => (
                        <p key={entite.directionServiceId} className="fr-tag fr-tag--sm fr-tag-default">
                          {entite.directionServiceName}
                        </p>
                      ))}
                    </>
                  ) : null}
                </div>
                {requestId &&
                  !requestQuery.error &&
                  requestQuery.data?.statutId === REQUETE_STATUT_TYPES.CLOTUREE &&
                  hasEditRole && (
                    <div className="fr-col-auto">
                      <Button
                        ref={reopenRequeteButtonRef}
                        size="small"
                        priority="primary"
                        onClick={handleReopenRequete}
                      >
                        Rouvrir
                      </Button>
                    </div>
                  )}
                {requestId && canEdit && !requestQuery.error && (
                  <div className="fr-col-auto">
                    <Button priority="secondary" className="fr-mr-2w" size="small" onClick={handleOpenCreate}>
                      Ajouter une étape
                    </Button>
                    <Button ref={closeRequeteButtonRef} size="small" priority="primary" onClick={handleCloseRequete}>
                      Clôturer
                    </Button>
                  </div>
                )}
              </div>
              {isEntityFilterVisible && requestQuery.data ? (
                <SegmentedControl
                  className="fr-mb-3w"
                  legend="Filtrer par entité"
                  inlineLegend
                  name="entiteId"
                  segments={entityFilterSegments}
                />
              ) : null}
              {content}
            </div>
          </div>
          <div className="fr-col-md-12 fr-col-lg-4 ">
            <OtherEntitiesAffected />
          </div>
        </div>
      </div>
    </div>
  );
};
