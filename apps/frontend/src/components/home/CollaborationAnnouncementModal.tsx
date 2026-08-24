import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { FEATURE_FLAGS } from '@sirena/common/constants';
import { type RefObject, useEffect, useMemo, useState } from 'react';
import { useHasFeature } from '@/hooks/useHasFeature';

const RELEASE_NOTES_URL = 'https://docs.numerique.gouv.fr/docs/24ca6ea9-c64d-4e30-8555-626166cb2d45/';
const CAMPAIGN = 'collaboration-v1';
const DISMISSED_CAMPAIGN_STORAGE_KEY = 'sirena.collaborationAnnouncement.dismissedCampaign';

function readDismissedCampaign(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(DISMISSED_CAMPAIGN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeDismissedCampaign(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DISMISSED_CAMPAIGN_STORAGE_KEY, CAMPAIGN);
  } catch {
    // Storage can be unavailable; the modal must still close for the current render.
  }
}

type CollaborationAnnouncementModalProps = {
  focusReturnRef: RefObject<HTMLElement | null>;
};

export function CollaborationAnnouncementModal({ focusReturnRef }: CollaborationAnnouncementModalProps) {
  const isEligible = useHasFeature(FEATURE_FLAGS.SHARED_PROCESSING_STEPS, false);
  const [dismissedCampaign, setDismissedCampaign] = useState<string | null>(readDismissedCampaign);
  const shouldShow = isEligible && dismissedCampaign !== CAMPAIGN;

  const modal = useMemo(
    () =>
      createModal({
        id: 'collaboration-announcement-modal',
        isOpenedByDefault: false,
      }),
    [],
  );

  useEffect(() => {
    if (!shouldShow) return;

    const modalElement = document.getElementById(modal.id);
    const handleConceal = () => {
      writeDismissedCampaign();
      setDismissedCampaign(CAMPAIGN);
      setTimeout(() => focusReturnRef.current?.focus(), 0);
    };

    modalElement?.addEventListener('dsfr.conceal', handleConceal);
    const openFrame = window.requestAnimationFrame(() => modal.open());

    return () => {
      window.cancelAnimationFrame(openFrame);
      modalElement?.removeEventListener('dsfr.conceal', handleConceal);
    };
  }, [focusReturnRef, modal, shouldShow]);

  if (!shouldShow) return null;

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
