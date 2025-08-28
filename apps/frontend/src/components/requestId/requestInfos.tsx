import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Tag } from '@codegouvfr/react-dsfr/Tag';
import { useParams } from '@tanstack/react-router';

export const RequestInfos = () => {
  const { requestId } = useParams({ from: '/_auth/_user/request/$requestId' });

  return (
    <div className="fr-grid-row fr-grid-row--gutters">
      <div className="fr-col">
        <h1 className="fr-mb-2w">
          Requête n°{requestId}
          <Badge severity="success" className="fr-ml-2w">
            À QUALIFIER
          </Badge>
        </h1>
        <div className="fr-text--sm fr-text--grey">
          <span className="fr-icon-map-pin-2-line fr-mr-1v" aria-hidden="true"></span>
          [Nom de la personne]
          <span className="fr-mx-2v">•</span>
          <span className="fr-icon-building-line fr-mr-1v" aria-hidden="true"></span>
          [Nom de l'établissement]
          <span className="fr-mx-2v">•</span>
          <span className="fr-icon-alarm-warning-line fr-mr-1v" aria-hidden="true"></span>
          Priorité
        </div>
        <div className="fr-text--sm fr-text--grey fr-mb-0">
          <span className="fr-icon-folder-2-line fr-mr-1v" aria-hidden="true"></span>
          Motifs : <Tag small>[Motif]</Tag>
        </div>
      </div>
      <div className="fr-col-auto">
        <div className="fr-grid-row fr-grid-row--middle fr-grid-row--gutters">
          <div className="fr-col-auto">
            <Tag>[Entité]</Tag>
          </div>
          <div className="fr-col-auto">
            <div className="fr-btns-group fr-btns-group--inline-sm" style={{ marginBottom: 0 }}>
              <Button priority="secondary" size="small">
                Attribuer
              </Button>
              <Button priority="primary" size="small">
                Clôturer
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
