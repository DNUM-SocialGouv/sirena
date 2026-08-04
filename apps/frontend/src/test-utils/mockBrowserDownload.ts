import { vi } from 'vitest';

/**
 * Spies on the browser download primitives (URL.createObjectURL / revokeObjectURL and the anchor
 * click) so a test can assert that a link-based file download was triggered and cleaned up.
 * Call `vi.restoreAllMocks()` in an afterEach to reset the spies.
 */
export function mockBrowserDownload(objectUrl = 'blob:download') {
  const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(objectUrl);
  const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  let clickedLink: HTMLAnchorElement | undefined;
  const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clickedLink = this;
  });

  return {
    clickSpy,
    createObjectURLSpy,
    get clickedLink() {
      return clickedLink;
    },
    objectUrl,
    revokeObjectURLSpy,
  };
}
