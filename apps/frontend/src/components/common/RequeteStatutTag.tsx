import Badge from '@codegouvfr/react-dsfr/Badge';
import { requeteEtapeStatutBadges, requeteStatutBadges, type StatutBadge } from '@/utils/requeteStatutBadge.constant';

type Props = {
  statut: string;
  noIcon?: boolean;
  className?: string;
};

export const StatutTag =
  (badges: StatutBadge[]) =>
  ({ statut, noIcon, className = '' }: Props) => {
    const badge = badges.find((badge) => badge.value === statut);

    if (!badge) {
      return null;
    }

    return (
      <Badge noIcon={noIcon} severity={badge.type} className={className}>
        {badge.text}
      </Badge>
    );
  };

export const RequeteStatutTag = StatutTag(requeteStatutBadges);

export const RequeteEtapeStatutTag = StatutTag(requeteEtapeStatutBadges);
