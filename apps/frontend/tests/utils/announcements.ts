/// <reference lib="dom" />
import type { BrowserContext } from '@playwright/test';

export async function autoCloseAnnouncements(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    const closeOpenAnnouncement = () => {
      const dialog = document.querySelector('dialog[id^="announcement-modal-"].fr-modal--opened');
      dialog?.querySelector<HTMLButtonElement>('.fr-btn--close')?.click();
    };
    const start = () =>
      new MutationObserver(closeOpenAnnouncement).observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class'],
      });
    if (document.documentElement) start();
    else document.addEventListener('DOMContentLoaded', start);
  });
}
