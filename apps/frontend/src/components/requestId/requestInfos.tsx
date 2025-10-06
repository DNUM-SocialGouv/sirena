interface RequestInfosProps {
  requestId?: string;
}

export const RequestInfos = ({ requestId }: RequestInfosProps = {}) => {
  // TODO: add more information about the request in header
  // FYI : Some heading information templates are present in commit 923ce16eb321ba90768b0941071a868bb8dba857
  return (
    <div className="fr-grid-row fr-grid-row--gutters">
      <div className="fr-col">
        <h1 className="fr-mb-2w">{requestId ? `Requête ${requestId}` : 'Nouvelle requête'}</h1>
        {!requestId && (
          <p className="fr-text--sm fr-mb-0">La requête sera créée lorsqu'au moins une donnée sera renseignée</p>
        )}
      </div>
    </div>
  );
};
