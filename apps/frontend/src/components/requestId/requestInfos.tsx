import { useParams } from '@tanstack/react-router';

export const RequestInfos = () => {
  const { requestId } = useParams({ from: '/_auth/_user/request/$requestId' });

  // @todo: add more information about the request in header
  // FYI : Some heading information templates are present in commit 923ce16eb321ba90768b0941071a868bb8dba857
  return (
    <div className="fr-grid-row fr-grid-row--gutters">
      <div className="fr-col">
        <h1 className="fr-mb-2w">Requête {requestId}</h1>
      </div>
    </div>
  );
};
