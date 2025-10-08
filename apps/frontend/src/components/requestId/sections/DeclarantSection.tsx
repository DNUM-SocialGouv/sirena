import { InfoSection } from '@sirena/ui';
import type { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';
import { ContactInfo, formatAddress, formatFullName, SectionTitle } from './helpers';

type DeclarantData = NonNullable<ReturnType<typeof useRequeteDetails>['data']>['requete']['declarant'];

interface DeclarantSectionProps {
  id: string;
  declarant?: DeclarantData | null;
  onEdit: () => void;
}

export const DeclarantSection = ({ id, declarant, onEdit }: DeclarantSectionProps) => {
  const declarantIdentite = declarant?.identite;
  const declarantAdresse = declarant?.adresse;

  const fullName = formatFullName(
    declarantIdentite
      ? {
          civilite: declarantIdentite.civiliteId ? { label: declarantIdentite.civiliteId } : undefined,
          prenom: declarantIdentite.prenom,
          nom: declarantIdentite.nom?.toUpperCase() || '',
        }
      : null,
  );
  const address = formatAddress(
    declarantAdresse
      ? {
          label: declarantAdresse.label,
          codePostal: declarantAdresse.codePostal,
          ville: declarantAdresse.ville,
        }
      : null,
  );

  const isFulfilled =
    !!fullName ||
    !!declarant?.lienVictime ||
    !!declarant?.lienAutrePrecision ||
    !!address ||
    !!declarantIdentite?.email ||
    !!declarantIdentite?.telephone ||
    !!declarant?.commentaire ||
    declarant?.veutGarderAnonymat !== null;

  const renderSummary = () => {
    if (!fullName && !declarantIdentite?.email && !declarantIdentite?.telephone) return null;

    return (
      <div className="fr-grid-row fr-grid-row--gutters">
        {fullName && (
          <ContactInfo icon="fr-icon-user-line" ariaLabel="Identité">
            {fullName}
          </ContactInfo>
        )}
        {declarantIdentite?.email && (
          <ContactInfo icon="fr-icon-mail-line" ariaLabel="Courrier électronique">
            {declarantIdentite.email}
          </ContactInfo>
        )}
        {declarantIdentite?.telephone && (
          <ContactInfo icon="fr-icon-phone-line" ariaLabel="Numéro de téléphone">
            {declarantIdentite.telephone}
          </ContactInfo>
        )}
      </div>
    );
  };

  const renderDetails = () => {
    if (!isFulfilled) return null;

    return (
      <>
        {fullName && (
          <>
            <SectionTitle>Identité</SectionTitle>
            <p className="fr-mb-2w">{fullName}</p>
            {declarant?.lienVictime && <p className="fr-mb-2w">{declarant.lienVictime.label}</p>}
            {declarant?.lienAutrePrecision && <p className="fr-mb-2w">{declarant.lienAutrePrecision}</p>}
          </>
        )}

        {address && (
          <>
            <SectionTitle>Adresse</SectionTitle>
            <p className="fr-mb-2w">{address}</p>
          </>
        )}

        {(declarantIdentite?.email || declarantIdentite?.telephone) && (
          <>
            <SectionTitle>Contact</SectionTitle>
            {declarantIdentite?.email && (
              <p className="fr-mb-1w">
                Courrier électronique : <a href={`mailto:${declarantIdentite.email}`}>{declarantIdentite.email}</a>
              </p>
            )}
            {declarantIdentite?.telephone && <p className="fr-mb-2w">Téléphone : {declarantIdentite.telephone}</p>}
          </>
        )}

        {(declarant?.commentaire || declarant?.veutGarderAnonymat !== null) && declarant && (
          <>
            <SectionTitle>Informations complémentaires</SectionTitle>
            {declarant.veutGarderAnonymat !== null && (
              <ul className="fr-mb-2w">
                <li>
                  {declarant.veutGarderAnonymat ? (
                    <>
                      ⚠️ Il/elle <strong>ne</strong> consent <strong>pas</strong> à ce que son identitée soit communiquée
                    </>
                  ) : (
                    'Il/elle consent à ce que son identitée soit communiquée'
                  )}
                </li>
              </ul>
            )}
            {declarant.commentaire && <p className="fr-mb-2w">{declarant.commentaire}</p>}
          </>
        )}
      </>
    );
  };

  return (
    <InfoSection
      id={id}
      title="Déclarant"
      onEdit={onEdit}
      renderSummary={renderSummary}
      renderDetails={isFulfilled ? renderDetails : undefined}
      emptyLabel="Aucune information sur le déclarant"
      replaceSummaryWithDetails={true}
    />
  );
};
