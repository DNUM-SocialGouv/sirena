/// <reference lib="dom" />
import type { BrowserContext } from '@playwright/test';

/**
 * The home announcement modal opens on top of the page and intercepts pointer
 * events, breaking any click-based test. Its dismissal is persisted in
 * localStorage, so we pre-seed that key before the app loads to keep it closed.
 *
 * NOTE: the stored value must match the latest campaign id exactly (see
 * AnnouncementModal). A new campaign will re-break e2e until this is bumped.
 */
const DISMISSED_CAMPAIGN_STORAGE_KEY = 'sirena.announcement.dismissedCampaign';
const LATEST_CAMPAIGN = 'collaboration-v1';

export async function dismissAnnouncements(context: BrowserContext): Promise<void> {
  await context.addInitScript(
    ([key, campaign]) => {
      try {
        window.localStorage.setItem(key, campaign);
      } catch {
        // localStorage can be unavailable; the modal will simply open.
      }
    },
    [DISMISSED_CAMPAIGN_STORAGE_KEY, LATEST_CAMPAIGN],
  );
}
