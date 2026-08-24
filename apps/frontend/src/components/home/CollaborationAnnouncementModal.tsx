import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { FEATURE_FLAGS } from '@sirena/common/constants';
import { useEffect, useMemo } from 'react';
import { useHasFeature } from '@/hooks/useHasFeature';

const RELEASE_NOTES_URL = 'https://docs.numerique.gouv.fr/docs/24ca6ea9-c64d-4e30-8555-626166cb2d45/';

export function CollaborationAnnouncementModal() {
  const isEligible = useHasFeature(FEATURE_FLAGS.SHARED_PROCESSING_STEPS, false);

  const modal = useMemo(
    () =>
      createModal({
        id: 'collaboration-announcement-modal',
        isOpenedByDefault: false,
      }),
    [],
  );

  useEffect(() => {
    if (isEligible) {
      modal.open();
    }
  }, [isEligible, modal]);

  if (!isEligible) return null;

  return (
    <modal.Component
      size="large"
      title="Collaborez plus facilement sur SIRENA"
      buttons={[
        {
          doClosesModal: true,
          children: 'Voir les nouveautés',
          linkProps: {
            href: RELEASE_NOTES_URL,
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        },
      ]}
    >
      <p>
        Vous pouvez désormais consulter et partager des étapes de traitement entre les périmètres racines affectés à une
        même requête.
      </p>
    </modal.Component>
  );
}
