import { InfoSection } from '@sirena/ui';
import type { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';
import { useCanEdit } from '@/hooks/useCanEdit';
import { ContactInfo, formatAddress, formatFullName, SectionTitle } from './helpers';

type PersonneData = NonNullable<ReturnType<typeof useRequeteDetails>['data']>['requete']['participant'];

interface PersonneConcerneeSectionProps {
  id: string;
  requestId?: string;
  personne?: PersonneData | null;
  onEdit: () => void;
}

export const PersonneConcerneeSection = ({ requestId, id, personne, onEdit }: PersonneConcerneeSectionProps) => {
  const { canEdit } = useCanEdit({ requeteId: requestId });
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
          numero: personneAdresse.numero,
          rue: personneAdresse.rue,
          codePostal: personneAdresse.codePostal,
          ville: personneAdresse.ville,
        }
      : null,
  );

  const dateNaissanceFormatted = personne?.dateNaissance
    ? new Date(personne.dateNaissance).toLocaleDateString('fr-FR')
    : undefined;

  const isFulfilled =
    !!fullName ||
    !!personne?.age?.label ||
    !!dateNaissanceFormatted ||
    !!address ||
    !!personneIdentite?.email ||
    !!personneIdentite?.telephone ||
    !!personne?.estHandicapee ||
    personne?.veutGarderAnonymat !== null ||
    !!personne?.estVictimeInformee ||
    !!personne?.aAutrePersonnes ||
    !!personne?.autrePersonnes ||
    !!personne?.commentaire;

  const renderSummary = () => {
    if (!fullName && !personneIdentite?.email && !personneIdentite?.telephone) {
      return null;
    }

    return (
      <div className="fr-grid-row fr-grid-row--gutters">
        {fullName && (
          <ContactInfo icon="fr-icon-user-line" ariaLabel="Identité nom prénom">
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

    const hasIdentitySection = !!(fullName || personne?.age?.label || dateNaissanceFormatted);
    const hasAddressSection = !!address;
    const hasContactSection = !!(personneIdentite?.email || personneIdentite?.telephone);
    const hasComplementaryInfo =
      !!personne?.estHandicapee ||
      (personne?.veutGarderAnonymat !== null && personne?.veutGarderAnonymat !== undefined) ||
      !!personne?.estVictimeInformee ||
      !!personne?.aAutrePersonnes ||
      !!personne?.autrePersonnes ||
      !!personne?.commentaire;

    if (!hasIdentitySection && !hasAddressSection && !hasContactSection && !hasComplementaryInfo) {
      return null;
    }

    return (
      <>
        {hasIdentitySection && (
          <>
            <SectionTitle level={4}>Identité</SectionTitle>
            {fullName && <p className="fr-mb-1w">{fullName}</p>}
            {personne?.age?.label && <p className="fr-text--sm fr-text--grey fr-mb-1w">Âge : {personne.age.label}</p>}
            {dateNaissanceFormatted && (
              <p className="fr-text--sm fr-text--grey fr-mb-2w">Date de naissance : {dateNaissanceFormatted}</p>
            )}
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
            {personneIdentite?.email && (
              <p className="fr-mb-1w">
                Courrier électronique : <a href={`mailto:${personneIdentite.email}`}>{personneIdentite.email}</a>
              </p>
            )}
            {personneIdentite?.telephone && <p className="fr-mb-2w">Téléphone : {personneIdentite.telephone}</p>}
          </>
        )}

        {hasComplementaryInfo && (
          <>
            <SectionTitle level={4}>Informations complémentaires</SectionTitle>
            <ul className="fr-mb-2w">
              {personne?.estHandicapee && <li>Il/elle est en situation d'handicap</li>}
              {personne?.veutGarderAnonymat !== null && personne?.veutGarderAnonymat !== undefined && (
                <li>
                  {personne.veutGarderAnonymat ? (
                    <>
                      ⚠️ Il/elle <strong>ne</strong> consent <strong>pas</strong> à ce que son identitée soit communiquée
                    </>
                  ) : (
                    'Il/elle consent à ce que son identitée soit communiquée'
                  )}
                </li>
              )}
              {personne?.estVictimeInformee && <li>Il/elle a été informé(e) de la démarche par le déclarant</li>}
            </ul>
            {personne?.aAutrePersonnes && (
              <>
                <p className="fr-mb-1w">Autres personnes concernées : {personne.aAutrePersonnes ? 'Oui' : 'Non'}</p>
                {personne.autrePersonnes && <p className="fr-mb-1w">{personne.autrePersonnes}</p>}
              </>
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
      canEdit={canEdit}
      renderSummary={renderSummary}
      renderDetails={isFulfilled ? renderDetails : undefined}
      emptyLabel="Aucune information"
      replaceSummaryWithDetails={true}
    />
  );
};
