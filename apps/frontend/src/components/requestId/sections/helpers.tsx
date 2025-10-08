export const formatFullName = (identite?: { civilite?: { label?: string }; prenom?: string; nom?: string } | null) => {
  if (!identite) return '';
  return [identite.civilite?.label, identite.prenom, identite.nom].filter(Boolean).join(' ');
};

export const formatAddress = (adresse?: { label?: string; codePostal?: string; ville?: string } | null) => {
  if (!adresse) return '';
  const postalCity = adresse.codePostal && adresse.ville ? `${adresse.codePostal} ${adresse.ville}` : null;
  return [adresse.label, postalCity].filter(Boolean).join(' ');
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
    <p className="fr-mb-0">
      <span className={icon} role="img" aria-label={ariaLabel} />
      {children}
    </p>
  </div>
);

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="fr-text--sm fr-text--bold fr-mb-1w fr-mt-3w">{children}</h3>
);
