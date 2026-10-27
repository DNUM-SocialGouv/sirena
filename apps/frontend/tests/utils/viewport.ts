import type { Page } from '@playwright/test';

/**
 * DSFR containers clip overflow instead of scrolling the document, hence the per-element measure.
 * An element inside a horizontally scrollable container — a wide table — scrolls rather than being
 * clipped, so it is excluded.
 */
export async function elementsOverflowingViewport(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const main = document.querySelector('main');
    if (!main) return ['<main> introuvable'];

    const hasScrollableAncestor = (element: Element): boolean => {
      for (let current = element.parentElement; current && current !== main; current = current.parentElement) {
        const { overflowX } = getComputedStyle(current);
        if (overflowX === 'auto' || overflowX === 'scroll') return true;
      }
      return false;
    };

    return Array.from(main.querySelectorAll('*'))
      .filter((element) => {
        const { width, height, right } = element.getBoundingClientRect();
        if (width === 0 || height === 0) return false;
        return right > viewportWidth + 1 && !hasScrollableAncestor(element);
      })
      .map((element) => `${element.tagName.toLowerCase()}.${element.className}`);
  });
}
