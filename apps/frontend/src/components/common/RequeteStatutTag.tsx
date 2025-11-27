import Badge from '@codegouvfr/react-dsfr/Badge';
import type { RequeteStatutType } from '@sirena/common/constants';
import { allBadges } from '@/utils/requeteStatutBadage.constant';

type Props = {
  statut: RequeteStatutType;
};

export const RequeteStatutTag = ({ statut }: Props) => {
  const badge = allBadges.find((badge) => badge.value === statut);

  if (!badge) {
    return null;
  }

  return <Badge severity={badge.type}>{badge.text}</Badge>;
};
