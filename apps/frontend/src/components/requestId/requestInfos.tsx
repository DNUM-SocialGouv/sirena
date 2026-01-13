import type { RequetePrioriteType } from '@sirena/common/constants';
import { useUpdatePriorite } from '@/hooks/mutations/updatePriorite.hook';
import { PrioriteMenu } from '../common/PrioriteMenu';
import { RequeteStatutTag } from '../common/RequeteStatutTag';
import style from './requestInfos.module.css';
import { ContactInfo } from './sections/helpers';

interface RequestInfosProps {
  requestId?: string;
  fullName: string | null;
  motifs: string[];
  statutId: string;
  prioriteId?: string | null;
}

export const RequestInfos = ({ requestId, fullName, motifs, statutId, prioriteId }: RequestInfosProps) => {
  const updatePrioriteMutation = useUpdatePriorite(requestId || '');

  const handlePrioriteChange = async (value: string | null) => {
    if (requestId) {
      await updatePrioriteMutation.mutateAsync({
        prioriteId: value as RequetePrioriteType | null,
      });
    }
  };
  // TODO: add more information about the request in header
  return (
    <div className="fr-grid-row fr-grid-row--gutters">
      <div className="fr-col">
        <div className="fr-grid-row fr-grid-row--gutters fr-grid-row--middle">
          <div className="fr-col">
            <h1 className={`fr-mb-2w ${style['request-title']}`}>
              {requestId ? (
                <>
                  Requête {requestId}{' '}
                  <RequeteStatutTag className={style['requete-statut-tag']} statut={statutId} noIcon />
                </>
              ) : (
                'Nouvelle requête'
              )}
            </h1>
          </div>
          {requestId && (
            <div className={`fr-col-auto ${style['priorite-menu-wrapper']}`}>
              <PrioriteMenu
                value={prioriteId || null}
                onPrioriteClick={handlePrioriteChange}
                isLoading={updatePrioriteMutation.isPending}
                disabled={!requestId || updatePrioriteMutation.isPending}
              />
            </div>
          )}
        </div>
        {fullName && (
          <div className={style['legend-display']}>
            <ContactInfo icon="fr-icon-user-line" ariaLabel="Identité - personne concernée">
              {fullName}
            </ContactInfo>
          </div>
        )}
        {motifs.length > 0 && (
          <div className={style['legend-display']}>
            {motifs.map((motif) => (
              <ContactInfo key={motif} icon="fr-icon-todo-line" ariaLabel="Motif de la requête">
                {motif}
              </ContactInfo>
            ))}
          </div>
        )}
        {!requestId && (
          <p className="fr-text--sm fr-mb-0">La requête sera créée lorsqu'au moins une donnée sera renseignée</p>
        )}
      </div>
    </div>
  );
};
