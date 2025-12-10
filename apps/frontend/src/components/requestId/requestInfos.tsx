import { RequeteStatutTag } from '../common/RequeteStatutTag';
import style from './requestInfos.module.css';
import { ContactInfo } from './sections/helpers';

interface RequestInfosProps {
  requestId?: string;
  fullName: string | null;
  motifs: string[];
  statutId: string;
}

export const RequestInfos = ({ requestId, fullName, motifs, statutId }: RequestInfosProps) => {
  // TODO: add more information about the request in header
  return (
    <div className="fr-grid-row fr-grid-row--gutters">
      <div className="fr-col">
        <h1 className="fr-mb-2w">
          {requestId ? (
            <>
              Requête {requestId} <RequeteStatutTag className={style['requete-statut-tag']} statut={statutId} noIcon />
            </>
          ) : (
            'Nouvelle requête'
          )}
        </h1>
        <div className={style['legend-display']}>
          {!!fullName && (
            <ContactInfo icon="fr-icon-user-line" ariaLabel="Identité">
              {fullName}
            </ContactInfo>
          )}
          {motifs.map((motif) => (
            <ContactInfo key={motif} icon="fr-icon-todo-line" ariaLabel="Motif de la requête">
              {motif}
            </ContactInfo>
          ))}
        </div>
        {!requestId && (
          <p className="fr-text--sm fr-mb-0">La requête sera créée lorsqu'au moins une donnée sera renseignée</p>
        )}
      </div>
    </div>
  );
};
