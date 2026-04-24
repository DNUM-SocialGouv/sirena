import { useParams } from '@tanstack/react-router';
import { EntiteTag } from '@/components/common/EntiteTag';
import { useRequeteOtherEntitiesAffected } from '@/hooks/queries/useRequeteDetails';
import styles from './OtherEntitesAffected.module.css';

export const OtherEntitiesAffected = () => {
  const { requestId } = useParams({
    from: '/_auth/_user/request/$requestId',
  });
  const { data: { otherEntites = [] } = {}, isLoading, error } = useRequeteOtherEntitiesAffected(requestId);
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
        <div className={styles['other-entities-affected-container']}>
          {otherEntites.map((entity) => (
            <div className={styles['other-entities-affected']} key={entity.id}>
              {!!entity && (
                <EntiteTag label={entity.nomComplet} entiteTypeId={entity.entiteTypeId} statut={entity.statutId} />
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="fr-text--sm">Aucune autre entité affectée</p>
      )}
    </div>
  );
};
