/// <reference lib="dom" />

import type { Page } from '@playwright/test';

/**
 * DSFR containers clip overflow instead of scrolling the document, hence the per-element measure.
 * An element inside a container that really scrolls horizontally — a wide table — scrolls rather
 * than being clipped, so it is excluded. The one-pixel tolerance absorbs `getBoundingClientRect`
 * rounding.
 */
export async function elementsOverflowingViewport(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const main = document.querySelector('main');
    if (!main) throw new Error('<main> introuvable');

    const hasScrollableAncestor = (element: Element): boolean => {
      for (let current = element.parentElement; current && current !== main; current = current.parentElement) {
        // `overflow-y: auto` alone computes `overflow-x` to `auto`, so without the scrollWidth
        // check every dropdown panel would be exempt.
        const { overflowX } = getComputedStyle(current);
        const scrolls = overflowX === 'auto' || overflowX === 'scroll';
        if (scrolls && current.scrollWidth > current.clientWidth) return true;
      }
      return false;
    };

    return Array.from(main.querySelectorAll('*'))
      .filter((element) => {
        const { width, height, right } = element.getBoundingClientRect();
        if (width === 0 || height === 0) return false;
        return right > viewportWidth + 1 && !hasScrollableAncestor(element);
      })
      .map((element) => `${element.tagName.toLowerCase()}.${element.getAttribute('class') ?? ''}`);
  });
}
