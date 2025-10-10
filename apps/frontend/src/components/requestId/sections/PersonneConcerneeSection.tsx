import { InfoSection } from '@sirena/ui';
import type { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';
import { ContactInfo, formatAddress, formatFullName, SectionTitle } from './helpers';

type PersonneData = NonNullable<ReturnType<typeof useRequeteDetails>['data']>['requete']['participant'];

interface PersonneConcerneeSectionProps {
  id: string;
  personne?: PersonneData | null;
  onEdit: () => void;
}

export const PersonneConcerneeSection = ({ id, personne, onEdit }: PersonneConcerneeSectionProps) => {
  const personneIdentite = personne?.identite;
  const personneAdresse = personne?.adresse;

  const fullName = formatFullName(
    personneIdentite
      ? {
          civilite: personneIdentite.civiliteId ? { label: personneIdentite.civiliteId } : undefined,
          prenom: personneIdentite.prenom,
          nom: personneIdentite.nom?.toUpperCase() || '',
        }
      : null,
  );
  const address = formatAddress(
    personneAdresse
      ? {
          label: personneAdresse.label,
          codePostal: personneAdresse.codePostal,
          ville: personneAdresse.ville,
        }
      : null,
  );

  const isFulfilled =
    !!fullName ||
    !!personne?.age?.label ||
    !!address ||
    !!personneIdentite?.email ||
    !!personneIdentite?.telephone ||
    !!personne?.estHandicapee ||
    !!personne?.veutGarderAnonymat ||
    !!personne?.estVictimeInformee ||
    !!personne?.autrePersonnes ||
    !!personne?.commentaire;

  const renderSummary = () => {
    if (!fullName && !personneIdentite?.email && !personneIdentite?.telephone) {
      return null;
    }

    return (
      <div className="fr-grid-row fr-grid-row--gutters">
        {fullName && (
          <ContactInfo icon="fr-icon-user-line" ariaLabel="Identité">
            {fullName}
          </ContactInfo>
        )}
        {personneIdentite?.email && (
          <ContactInfo icon="fr-icon-mail-line" ariaLabel="Courrier électronique">
            {personneIdentite.email}
          </ContactInfo>
        )}
        {personneIdentite?.telephone && (
          <ContactInfo icon="fr-icon-phone-line" ariaLabel="Numéro de téléphone">
            {personneIdentite.telephone}
          </ContactInfo>
        )}
      </div>
    );
  };

  const renderDetails = () => {
    if (!isFulfilled) return null;

    return (
      <>
        {(fullName || personne?.age?.label) && (
          <>
            <SectionTitle>Identité</SectionTitle>
            {fullName && <p className="fr-mb-1w">{fullName}</p>}
            {personne?.age?.label && <p className="fr-text--sm fr-text--grey fr-mb-2w">Âge : {personne.age.label}</p>}
          </>
        )}

        {address && (
          <>
            <SectionTitle>Adresse</SectionTitle>
            <p className="fr-mb-2w">{address}</p>
          </>
        )}

        {(personneIdentite?.email || personneIdentite?.telephone) && (
          <>
            <SectionTitle>Contact</SectionTitle>
            {personneIdentite?.email && (
              <p className="fr-mb-1w">
                Courrier électronique : <a href={`mailto:${personneIdentite.email}`}>{personneIdentite.email}</a>
              </p>
            )}
            {personneIdentite?.telephone && <p className="fr-mb-2w">Téléphone : {personneIdentite.telephone}</p>}
          </>
        )}

        {(personne?.estHandicapee ||
          personne?.veutGarderAnonymat ||
          personne?.estVictimeInformee ||
          personne?.autrePersonnes ||
          personne?.commentaire) && (
          <>
            <SectionTitle>Informations complémentaires</SectionTitle>
            <ul className="fr-mb-2w">
              {personne?.estHandicapee && <li>Il/elle est en situation d'handicap</li>}
              {personne?.veutGarderAnonymat ? (
                <li>Il/elle ne souhaite pas que son identité soit communiquée</li>
              ) : (
                <li>Il/elle consent à ce que son identitée soit communiquée</li>
              )}
              {personne?.estVictimeInformee && <li>Il/elle a été informé(e) de la démarche par le déclarant</li>}
            </ul>
            {personne?.autrePersonnes && (
              <p className="fr-mb-1w">Autres personnes concernées : {personne.autrePersonnes}</p>
            )}
            {personne?.commentaire && <p className="fr-mb-2w">Précisions supplémentaires : {personne.commentaire}</p>}
          </>
        )}
      </>
    );
  };

  return (
    <InfoSection
      id={id}
      title="Personne concernée"
      onEdit={onEdit}
      renderSummary={renderSummary}
      renderDetails={isFulfilled ? renderDetails : undefined}
      emptyLabel="Aucune information sur la personne concernée"
      replaceSummaryWithDetails={true}
    />
  );
};
