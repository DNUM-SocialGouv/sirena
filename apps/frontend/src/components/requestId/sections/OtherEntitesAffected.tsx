import { useParams } from '@tanstack/react-router';
import { EntiteTag } from '@/components/common/EntiteTag';
import { useRequeteOtherEntitiesAffected } from '@/hooks/queries/useRequeteDetails';
import styles from './OtherEntitesAffected.module.css';

export const OtherEntitiesAffected = () => {
  const { requestId } = useParams({
    from: '/_auth/_user/request/$requestId',
  });
  const { data = [], isLoading, error } = useRequeteOtherEntitiesAffected(requestId);
  if (isLoading) {
    return <div>Chargement...</div>;
  }

  if (error) {
    return <div>Erreur lors du chargement des autres entités affectées.</div>;
  }

  const hasOtherEntitiesAffected = data.length > 0;

  return (
    <div>
      <span>{hasOtherEntitiesAffected ? 'Autres entités affectées' : 'Aucune autre entité affectée'}</span>
      {hasOtherEntitiesAffected && (
        <div className={styles['other-entities-affected-container']}>
          {data.map((entity) => (
            <div className={styles['other-entities-affected']} key={entity.entite.id}>
              {!!entity.lastEtape && (
                <EntiteTag
                  label={entity.entite.nomComplet}
                  entiteTypeId={entity.entite.entiteTypeId}
                  statut={entity.lastEtape.statutId}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
