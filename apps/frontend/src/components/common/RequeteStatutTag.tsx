import Badge from '@codegouvfr/react-dsfr/Badge';
import { REQUETE_PRIORITE_TYPES } from '@sirena/common/constants';
import {
  requeteEtapeStatutBadges,
  requetePrioriteBadges,
  requeteStatutBadges,
  type StatutBadge,
} from '@/utils/requeteStatutBadge.constant';
import prioriteStyles from './PrioriteMenu.module.css';

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

export const RequetePrioriteTag = ({ statut, noIcon, className = '' }: Props) => {
  const badge = requetePrioriteBadges.find((badge) => badge.value === statut);

  if (!badge) {
    return null;
  }

  const prioriteClassMap: Record<string, string> = {
    [REQUETE_PRIORITE_TYPES.HAUTE]: prioriteStyles['priorite-haute'],
    [REQUETE_PRIORITE_TYPES.MOYENNE]: prioriteStyles['priorite-moyenne'],
    [REQUETE_PRIORITE_TYPES.BASSE]: prioriteStyles['priorite-basse'],
  };

  const prioriteClassName = prioriteClassMap[statut] || '';
  const combinedClassName = `${className} ${prioriteClassName}`.trim();

  return (
    <Badge noIcon={noIcon} severity={badge.type} className={combinedClassName}>
      {badge.text}
    </Badge>
  );
};
