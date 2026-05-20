import { Notice } from '@codegouvfr/react-dsfr/Notice';
import { FEATURE_FLAGS } from '@sirena/common/constants';
import { useState } from 'react';
import { APP_VERSION } from '@/config/version.constant';
import { useHasFeature } from '@/hooks/useHasFeature';

const RELEASE_NOTES_URL = 'https://docs.numerique.gouv.fr/docs/24ca6ea9-c64d-4e30-8555-626166cb2d45/';
const DISMISSED_VERSION_STORAGE_KEY = 'sirena.updateBanner.dismissedVersion';

function readDismissedVersion(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(DISMISSED_VERSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeDismissedVersion(version: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DISMISSED_VERSION_STORAGE_KEY, version);
  } catch {
    // Storage may be unavailable (private mode, quota); silently ignore so the banner still closes for the session.
  }
}

export function UpdateBanner() {
  const isEnabled = useHasFeature(FEATURE_FLAGS.UPDATE_BANNER, false);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(readDismissedVersion);

  if (!isEnabled) return null;
  if (dismissedVersion === APP_VERSION) return null;

  const handleClose = () => {
    writeDismissedVersion(APP_VERSION);
    setDismissedVersion(APP_VERSION);
  };

  return (
    <Notice
      title="Nouvelle mise à jour"
      description="Découvrez les dernières fonctionnalités disponibles sur SIRENA"
      severity="info"
      isClosable
      onClose={handleClose}
      link={{
        linkProps: {
          href: RELEASE_NOTES_URL,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        text: 'En savoir plus',
      }}
    />
  );
}
