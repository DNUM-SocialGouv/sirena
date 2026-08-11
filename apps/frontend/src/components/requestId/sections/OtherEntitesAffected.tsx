import { FEATURE_FLAGS } from '@sirena/common/constants';
import { useParams } from '@tanstack/react-router';
import { EntiteTag } from '@/components/common/EntiteTag';
import { useRequeteOtherEntitiesAffected } from '@/hooks/queries/useRequeteDetails';
import { useHasFeature } from '@/hooks/useHasFeature';
import styles from './OtherEntitesAffected.module.css';

export const OtherEntitiesAffected = () => {
  const { requestId } = useParams({
    from: '/_auth/_user/request/$requestId',
  });
  const { data: { otherEntites = [] } = {}, isLoading, error } = useRequeteOtherEntitiesAffected(requestId);
  const etapesPartageesActivees = useHasFeature(FEATURE_FLAGS.SHARED_PROCESSING_STEPS, false);
  if (isLoading) {
    return <div>Chargement...</div>;
  }

  if (error) {
    return <div>Erreur lors du chargement des autres entités affectées.</div>;
  }

  const hasOtherEntitiesAffected = otherEntites.length > 0;

  return (
    <div>
      <h2 className="fr-text--lg fr-mb-2w fr-text--bold">Autres entités affectées</h2>
      {hasOtherEntitiesAffected ? (
        <ul className={styles['other-entities-affected-container']}>
          {otherEntites.map((entity) => (
            <li
              className={styles['other-entities-affected']}
              key={entity.id}
              data-entity-relation={etapesPartageesActivees ? 'foreign' : undefined}
            >
              {!!entity && (
                <EntiteTag label={entity.nomComplet} entiteTypeId={entity.entiteTypeId} statut={entity.statutId} />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="fr-text--sm">Aucune autre entité affectée</p>
      )}
    </div>
  );
};
