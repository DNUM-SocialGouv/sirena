import { fr } from '@codegouvfr/react-dsfr';
import type { JSX } from 'react/jsx-runtime';

export const capitalizeFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

export const formatFullName = (
  identite?: { civilite?: { label?: string }; prenom?: string; nom?: string } | null,
): JSX.Element | null => {
  if (!identite) return null;
  const civiliteLabel = identite.civilite?.label;
  const formattedCivilite = civiliteLabel ? (civiliteLabel === 'M' ? `${civiliteLabel}.` : civiliteLabel) : '';
  const parts: Array<{ key: string; node: JSX.Element | string }> = [];
  if (formattedCivilite) parts.push({ key: 'civilite', node: formattedCivilite });
  if (identite.nom) parts.push({ key: 'nom', node: <span className="lastname">{identite.nom}</span> });
  if (identite.prenom) parts.push({ key: 'prenom', node: identite.prenom });
  if (parts.length === 0) return null;

  return (
    <>
      {parts.map((part, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: parts are conditional; index disambiguates position
        <span key={`${part.key}-${index}`}>
          {index > 0 ? ' ' : ''}
          {part.node}
        </span>
      ))}
    </>
  );
};

export const formatAddress = (
  adresse?: { label?: string; rue?: string; codePostal?: string; ville?: string } | null,
) => {
  if (!adresse) return '';

  return [adresse.label, adresse.rue, adresse.codePostal, adresse.ville].filter(Boolean).join(' ');
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

export const renderConsentIdentite = (veutGarderAnonymat: boolean) => {
  if (veutGarderAnonymat) {
    return (
      <>
        Il/elle <strong>ne</strong> consent <strong>pas</strong> à ce que son identité soit communiquée
      </>
    );
  }

  return 'Il/elle consent à ce que son identité soit communiquée';
};
interface SectionTitleProps {
  children: React.ReactNode;
  level?: 2 | 3 | 4 | 5 | 6;
}

export const SectionTitle = ({ children, level }: SectionTitleProps) => {
  const TitleTag = `h${level}` as keyof JSX.IntrinsicElements;

  return <TitleTag className={fr.cx('fr-text--sm', 'fr-mb-1w', 'fr-mt-3w')}>{children}</TitleTag>;
};
