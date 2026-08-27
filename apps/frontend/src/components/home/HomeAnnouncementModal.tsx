import { fr } from '@codegouvfr/react-dsfr';
import { FEATURE_FLAGS } from '@sirena/common/constants';
import type { RefObject } from 'react';
import { useHasFeature } from '@/hooks/useHasFeature';
import { LatestAnnouncementModal } from './LatestAnnouncementModal';

const RELEASE_NOTES_URL = 'https://docs.numerique.gouv.fr/docs/24ca6ea9-c64d-4e30-8555-626166cb2d45/';

const COLLABORATION_ANNOUNCEMENT = {
  campaign: 'collaboration-v1',
  title: 'De nouvelles fonctionnalités sont disponibles !',
  action: {
    label: 'Voir la documentation',
    href: RELEASE_NOTES_URL,
    target: '_blank',
    rel: 'noopener noreferrer',
  },
  content: <CollaborationAnnouncementContent />,
} as const;

type HomeAnnouncementModalProps = {
  focusReturnRef: RefObject<HTMLElement | null>;
};

export function HomeAnnouncementModal({ focusReturnRef }: HomeAnnouncementModalProps) {
  const isCollaborationEligible = useHasFeature(FEATURE_FLAGS.SHARED_PROCESSING_STEPS, false);

  // Keep configurations ordered from oldest to newest. Only the last one can be displayed.
  const announcements = [
    {
      ...COLLABORATION_ANNOUNCEMENT,
      isEligible: isCollaborationEligible,
    },
  ];

  return <LatestAnnouncementModal announcements={announcements} focusReturnRef={focusReturnRef} />;
}

function CollaborationAnnouncementContent() {
  return (
    <>
      <p className={fr.cx('fr-text--lg', 'fr-mb-3w')}>
        <strong>
          Pour les requêtes en compétences partagées, l’onglet Traitement affiche désormais les étapes réalisées par
          toutes les entités affectées à la requête :
        </strong>
      </p>
      <ul className={fr.cx('fr-raw-list', 'fr-text--md')}>
        <li className={fr.cx('fr-mb-3w')}>
          <span aria-hidden="true">⭐</span> Vous pouvez toujours ajouter et modifier vos propres étapes, et désormais
          choisir de les afficher ou non pour toutes les entités affectées à la requête ;
        </li>
        <li className={fr.cx('fr-mb-3w')}>
          <span aria-hidden="true">⭐</span> Vous pouvez visualiser les étapes ajoutées par les autres entités ;
        </li>
        <li>
          <span aria-hidden="true">⭐</span> Vous pouvez filtrer les étapes par entité.
        </li>
      </ul>
    </>
  );
}
