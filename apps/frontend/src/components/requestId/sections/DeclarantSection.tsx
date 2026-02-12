import { InfoSection } from '@sirena/ui';
import type { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';
import { useCanEdit } from '@/hooks/useCanEdit';
import { ContactInfo, formatAddress, formatFullName, SectionTitle } from './helpers';

type DeclarantData = NonNullable<ReturnType<typeof useRequeteDetails>['data']>['requete']['declarant'];

interface DeclarantSectionProps {
  id: string;
  requestId?: string;
  declarant?: DeclarantData | null;
  editHref?: string;
}

export const DeclarantSection = ({ requestId, id, declarant, editHref }: DeclarantSectionProps) => {
  const declarantIdentite = declarant?.identite;
  const declarantAdresse = declarant?.adresse;
  const { canEdit } = useCanEdit({ requeteId: requestId });

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
          numero: declarantAdresse.numero,
          rue: declarantAdresse.rue,
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
    declarant?.veutGarderAnonymat !== null ||
    !!declarant?.estSignalementProfessionnel;

  const renderSummary = () => {
    if (!fullName && !declarantIdentite?.email && !declarantIdentite?.telephone) return null;

    return (
      <div className="fr-grid-row fr-grid-row--gutters">
        {fullName && (
          <ContactInfo icon="fr-icon-user-line" ariaLabel="Identité nom prénom">
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

    const hasIdentitySection = !!fullName || !!declarant?.lienVictime || !!declarant?.lienAutrePrecision;
    const hasAddressSection = !!address;
    const hasContactSection = !!(declarantIdentite?.email || declarantIdentite?.telephone);
    const hasComplementaryInfo =
      !!declarant?.commentaire ||
      (declarant?.veutGarderAnonymat !== null && declarant?.veutGarderAnonymat !== undefined) ||
      !!declarant?.estSignalementProfessionnel;

    if (!hasIdentitySection && !hasAddressSection && !hasContactSection && !hasComplementaryInfo) {
      return null;
    }

    return (
      <>
        {hasIdentitySection && (
          <>
            {fullName && (
              <>
                <SectionTitle level={4}>Identité</SectionTitle>
                <p className="fr-mb-2w">{fullName}</p>
              </>
            )}
            {declarant?.lienVictime && <p className="fr-mb-2w">{declarant.lienVictime.label}</p>}
            {declarant?.lienAutrePrecision && <p className="fr-mb-2w">{declarant.lienAutrePrecision}</p>}
          </>
        )}

        {hasAddressSection && (
          <>
            <SectionTitle level={4}>Adresse</SectionTitle>
            <p className="fr-mb-2w">{address}</p>
          </>
        )}

        {hasContactSection && (
          <>
            <SectionTitle level={4}>Contact</SectionTitle>
            {declarantIdentite?.email && (
              <p className="fr-mb-1w">
                Courrier électronique : <a href={`mailto:${declarantIdentite.email}`}>{declarantIdentite.email}</a>
              </p>
            )}
            {declarantIdentite?.telephone && <p className="fr-mb-2w">Téléphone : {declarantIdentite.telephone}</p>}
          </>
        )}

        {hasComplementaryInfo && declarant && (
          <>
            <SectionTitle level={4}>Informations complémentaires</SectionTitle>
            <ul className="fr-mb-2w">
              {declarant.veutGarderAnonymat !== null && declarant.veutGarderAnonymat !== undefined && (
                <li>
                  {declarant.veutGarderAnonymat ? (
                    <>
                      ⚠️ Il/elle <strong>ne</strong> consent <strong>pas</strong> à ce que son identitée soit communiquée
                    </>
                  ) : (
                    'Il/elle consent à ce que son identitée soit communiquée'
                  )}
                </li>
              )}
              {declarant.estSignalementProfessionnel && (
                <li>
                  Le déclarant est un professionnel qui signale des dysfonctionnements et événements indésirables graves
                  (EIG)
                </li>
              )}
            </ul>
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
      editHref={editHref}
      canEdit={canEdit}
      renderSummary={renderSummary}
      renderDetails={isFulfilled ? renderDetails : undefined}
      emptyLabel="Aucune information"
      replaceSummaryWithDetails={true}
    />
  );
};
