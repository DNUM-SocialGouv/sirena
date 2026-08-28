import { fr } from '@codegouvfr/react-dsfr';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

const DISMISSED_CAMPAIGN_STORAGE_KEY = 'sirena.announcement.dismissedCampaign';

function readDismissedCampaign(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(DISMISSED_CAMPAIGN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export type AnnouncementAction = {
  label: ReactNode;
  href: string;
  target?: '_blank';
  rel?: string;
};

type AnnouncementModalProps = {
  campaign: string;
  title: string;
  children: ReactNode;
  action?: AnnouncementAction;
};

export function AnnouncementModal({ campaign, title, children, action }: AnnouncementModalProps) {
  const [dismissedCampaign, setDismissedCampaign] = useState<string | null>(readDismissedCampaign);

  const modal = useMemo(
    () =>
      createModal({
        id: `announcement-modal-${campaign}`,
        isOpenedByDefault: false,
      }),
    [campaign],
  );

  useEffect(() => {
    if (dismissedCampaign === campaign) {
      return;
    }

    const modalElement = document.getElementById(modal.id);
    const handleConceal = () => {
      try {
        window.localStorage.setItem(DISMISSED_CAMPAIGN_STORAGE_KEY, campaign);
      } catch {
        // Storage can be unavailable; the modal must still close for the current render.
      }

      setDismissedCampaign(campaign);
    };

    modalElement?.addEventListener('dsfr.conceal', handleConceal);
    const openFrame = window.requestAnimationFrame(() => modal.open());

    return () => {
      window.cancelAnimationFrame(openFrame);
      modalElement?.removeEventListener('dsfr.conceal', handleConceal);
    };
  }, [campaign, dismissedCampaign, modal]);

  if (dismissedCampaign === campaign) return null;

  return (
    <modal.Component
      size="large"
      title={title}
      titleProps={{ className: fr.cx('fr-h5', 'fr-mb-4w') }}
      buttons={
        action
          ? [
              {
                doClosesModal: true,
                children: action.label,
                linkProps: {
                  href: action.href,
                  target: action.target,
                  rel: action.rel,
                },
              },
            ]
          : undefined
      }
    >
      {children}
    </modal.Component>
  );
}
