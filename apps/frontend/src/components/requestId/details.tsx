import { InfoSection } from '@sirena/ui';
import { useNavigate } from '@tanstack/react-router';
import { useId } from 'react';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';

interface DetailsProps {
  requestId?: string;
}

export const Details = ({ requestId }: DetailsProps) => {
  const navigate = useNavigate();
  const declarantSectionId = useId();
  const personneSectionId = useId();
  const requestQuery = useRequeteDetails(requestId);

  const handleEditDeclarant = () => {
    if (requestId) {
      navigate({ to: '/request/$requestId/declarant', params: { requestId } });
    } else {
      navigate({ to: '/request/create/declarant' });
    }
  };

  if (!requestId) {
    return (
      <>
        <InfoSection
          id={declarantSectionId}
          title="Déclarant"
          onEdit={handleEditDeclarant}
          emptyLabel="Aucune information sur le déclarant"
        />

        <InfoSection
          id={personneSectionId}
          title="Personne concernée"
          emptyLabel="Aucune information sur la personne concernée"
        />
      </>
    );
  }

  return (
    <QueryStateHandler query={requestQuery}>
      {() => {
        const request = requestQuery.data;
        const declarant = request?.requete?.declarant;
        const declarantIdentite = declarant?.identite;
        const declarantAdresse = declarant?.adresse;

        const renderDeclarantSummary = () => {
          if (!declarant || !declarantIdentite) return null;

          const fullName = [declarantIdentite.civilite?.label, declarantIdentite.prenom, declarantIdentite.nom]
            .filter(Boolean)
            .join(' ');

          if (!fullName && !declarantIdentite.email && !declarantIdentite.telephone) return null;

          return (
            <div className="fr-grid-row fr-grid-row--gutters">
              {fullName && (
                <div className="fr-col-auto">
                  <p className="fr-mb-0">
                    <span className="fr-icon-user-line" aria-hidden="true" /> {fullName}
                  </p>
                </div>
              )}
              {declarantIdentite.email && (
                <div className="fr-col-auto">
                  <p className="fr-mb-0">
                    <span className="fr-icon-mail-line" aria-hidden="true" /> {declarantIdentite.email}
                  </p>
                </div>
              )}
              {declarantIdentite.telephone && (
                <div className="fr-col-auto">
                  <p className="fr-mb-0">
                    <span className="fr-icon-phone-line" aria-hidden="true" /> {declarantIdentite.telephone}
                  </p>
                </div>
              )}
            </div>
          );
        };

        const renderDeclarantDetails = () => {
          if (!declarant || !declarantIdentite) return null;

          const fullName = [declarantIdentite.civilite?.label, declarantIdentite.prenom, declarantIdentite.nom]
            .filter(Boolean)
            .join(' ');

          const hasAnyData =
            fullName ||
            declarant.lienVictime ||
            declarant.lienAutrePrecision ||
            declarantAdresse ||
            declarantIdentite.email ||
            declarantIdentite.telephone ||
            declarant.commentaire ||
            declarant.veutGarderAnonymat;

          if (!hasAnyData) return null;

          return (
            <>
              {fullName && (
                <>
                  <h3 className="fr-text--sm fr-text--bold fr-mb-1w">Identité</h3>
                  <p className="fr-mb-2w">{fullName}</p>
                  {declarant.lienVictime && <p className="fr-mb-2w">{declarant.lienVictime.label}</p>}
                  {declarant.lienAutrePrecision && <p className="fr-mb-2w">{declarant.lienAutrePrecision}</p>}
                </>
              )}

              {declarantAdresse &&
                (declarantAdresse.label || declarantAdresse.codePostal || declarantAdresse.ville) && (
                  <>
                    <h3 className="fr-text--sm fr-text--bold fr-mb-1w fr-mt-3w">Adresse</h3>
                    <p className="fr-mb-2w">
                      {[
                        declarantAdresse.label,
                        declarantAdresse.codePostal && declarantAdresse.ville
                          ? `${declarantAdresse.codePostal} ${declarantAdresse.ville}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    </p>
                  </>
                )}

              {(declarantIdentite.email || declarantIdentite.telephone) && (
                <>
                  <h3 className="fr-text--sm fr-text--bold fr-mb-1w fr-mt-3w">Contact</h3>
                  {declarantIdentite.email && (
                    <p className="fr-mb-1w">
                      Courrier électronique :{' '}
                      <a href={`mailto:${declarantIdentite.email}`}>{declarantIdentite.email}</a>
                    </p>
                  )}
                  {declarantIdentite.telephone && <p className="fr-mb-2w">Téléphone : {declarantIdentite.telephone}</p>}
                </>
              )}

              {(declarant.commentaire || declarant.veutGarderAnonymat) && (
                <>
                  <h3 className="fr-text--sm fr-text--bold fr-mb-1w fr-mt-3w">Informations complémentaires</h3>
                  {declarant.veutGarderAnonymat ? (
                    <ul className="fr-mb-2w">
                      <li>
                        ⚠️ Il/elle <strong>ne</strong> consent <strong>pas</strong> à ce que son identitée soit
                        communiquée
                      </li>
                    </ul>
                  ) : (
                    <ul className="fr-mb-2w">
                      <li>Il/elle consent à ce que son identitée soit communiquée</li>
                    </ul>
                  )}
                  {declarant.commentaire && <p className="fr-mb-2w">{declarant.commentaire}</p>}
                </>
              )}
            </>
          );
        };

        const renderPersonneConcerneeSummary = () => {
          return null;
        };

        return (
          <>
            <InfoSection
              id={declarantSectionId}
              title="Déclarant"
              onEdit={handleEditDeclarant}
              renderSummary={renderDeclarantSummary}
              renderDetails={renderDeclarantDetails}
              emptyLabel="Aucune information sur le déclarant"
              replaceSummaryWithDetails={true}
            />

            <InfoSection
              id={personneSectionId}
              title="Personne concernée"
              renderSummary={renderPersonneConcerneeSummary}
              emptyLabel="Aucune information sur la personne concernée"
            />
          </>
        );
      }}
    </QueryStateHandler>
  );
};
