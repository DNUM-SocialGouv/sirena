import { fr } from '@codegouvfr/react-dsfr';

export const formatFullName = (identite?: { civilite?: { label?: string }; prenom?: string; nom?: string } | null) => {
  if (!identite) return '';
  const civiliteLabel = identite.civilite?.label;
  const formattedCivilite = civiliteLabel ? (civiliteLabel === 'M' ? `${civiliteLabel}.` : civiliteLabel) : '';
  return [formattedCivilite, identite.nom, identite.prenom].filter(Boolean).join(' ');
};

export const formatAddress = (
  adresse?: { label?: string; numero?: string; rue?: string; codePostal?: string; ville?: string } | null,
) => {
  if (!adresse) return '';
  if (adresse.label?.trim()) {
    return adresse.label;
  }

  const postalCity = adresse.codePostal && adresse.ville ? `${adresse.codePostal} ${adresse.ville}` : null;
  return [adresse.numero, adresse.rue, postalCity].filter(Boolean).join(' ');
};

export const ContactInfo = ({
  icon,
  children,
  ariaLabel,
}: {
  icon: string;
  children: React.ReactNode;
  ariaLabel: string;
}) => (
  <div className="fr-col-auto">
    <p className={fr.cx('fr-mb-0')}>
      <span className={icon} role="img" aria-label={ariaLabel} />
      {children}
    </p>
  </div>
);

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className={fr.cx('fr-text--sm', 'fr-mb-1w', 'fr-mt-3w')}>{children}</h3>
);
