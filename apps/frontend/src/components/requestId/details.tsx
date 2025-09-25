import { InfoSection } from '@sirena/ui';
import { useId } from 'react';

export const Details = () => {
  const personneId = useId();

  return (
    <div>
      <InfoSection
        id={personneId}
        title="Personne concernée"
        onEdit={() => console.log('Edit personne concernée')}
        renderSummary={() => (
          <div className="fr-text--sm">
            <p className="fr-text--bold fr-mb-1w">Identité</p>
            <p className="fr-mb-2w">M. John Doe</p>
            <p className="fr-text--sm fr-text--grey fr-mb-1w">Âge : entre 7 et 77 ans</p>

            <p className="fr-text--bold fr-mb-1w fr-mt-3w">Adresse</p>
            <p className="fr-mb-2w">xxx</p>

            <p className="fr-text--bold fr-mb-1w fr-mt-3w">Informations complémentaires</p>
          </div>
        )}
        emptyLabel="Aucune information sur la personne concernée"
      />
    </div>
  );
};
