import { Notice } from '@codegouvfr/react-dsfr/Notice';
import { FEATURE_FLAGS } from '@sirena/common/constants';
import { useCallback, useSyncExternalStore } from 'react';
import { useHasPublicFeature } from '@/hooks/useHasPublicFeature';
import {
  dismissWarningBanner,
  isWarningBannerDismissed,
  subscribeToWarningBannerDismissal,
} from '@/lib/warningBannerDismissal';
import { WARNING_BANNER_CONTENT } from './warningBannerContent';

// RGAA 3.1: the nature of the message must not rest on the warning colour and icon alone.
const TITLE_PREFIX = 'Avertissement : ';

export function WarningBanner() {
  const isEnabled = useHasPublicFeature(FEATURE_FLAGS.WARNING_BANNER, false);
  const isDismissed = useSyncExternalStore(subscribeToWarningBannerDismissal, isWarningBannerDismissed);

  const handleClose = useCallback(() => {
    dismissWarningBanner();
    // The close button leaves the DOM with the banner: hand the focus to the main content rather
    // than let it fall back to <body>, which would restart tabbing at the top of the page.
    document.getElementById('main')?.focus();
  }, []);

  if (!isEnabled) return null;
  if (isDismissed) return null;

  const { title, description, link } = WARNING_BANNER_CONTENT;

  return (
    <Notice
      title={`${TITLE_PREFIX}${title}`}
      description={description}
      severity="warning"
      isClosable
      onClose={handleClose}
      link={
        link
          ? {
              linkProps: {
                href: link.href,
                target: '_blank',
                rel: 'noopener noreferrer',
              },
              text: (
                <>
                  {link.text}
                  <span className="fr-sr-only"> (nouvelle fenêtre)</span>
                </>
              ),
            }
          : undefined
      }
    />
  );
}
