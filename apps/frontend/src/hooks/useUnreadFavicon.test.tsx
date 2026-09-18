import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderBadgedFavicon, useUnreadFavicon } from './useUnreadFavicon';

const BADGED_HREF = 'data:image/png;base64,badge';

const ORIGINAL_HREF = '/favicon.svg';

const fakeContext = {
  drawImage: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  fillText: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  font: '',
  textAlign: '',
  textBaseline: '',
};

const imageSources: string[] = [];

describe('useUnreadFavicon', () => {
  let link: HTMLLinkElement;

  beforeEach(() => {
    link = document.createElement('link');
    link.rel = 'icon';
    link.href = ORIGINAL_HREF;
    link.type = 'image/svg+xml';
    document.head.appendChild(link);

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeContext as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(BADGED_HREF);
    imageSources.length = 0;
    vi.spyOn(globalThis, 'Image').mockImplementation(function FakeImage() {
      const image = { onload: null as null | (() => void), onerror: null as null | (() => void), src: '' };
      setTimeout(() => {
        imageSources.push(image.src);
        image.onload?.();
      }, 0);
      return image as unknown as HTMLImageElement;
    });
  });

  afterEach(() => {
    link.remove();
    vi.restoreAllMocks();
  });

  it('replaces the tab icon with a badged one while there are unread messages', async () => {
    renderHook(() => useUnreadFavicon(3));

    await waitFor(() => expect(link.getAttribute('href')).toBe(BADGED_HREF));
    expect(link.getAttribute('type')).toBe('image/png');
    expect(fakeContext.fillText).toHaveBeenCalledWith('3', expect.any(Number), expect.any(Number));
  });

  it('restores the original icon when the count drops to zero', async () => {
    const { rerender } = renderHook(({ count }) => useUnreadFavicon(count), { initialProps: { count: 2 } });
    await waitFor(() => expect(link.getAttribute('href')).toBe(BADGED_HREF));

    rerender({ count: 0 });

    expect(link.getAttribute('href')).toBe(ORIGINAL_HREF);
    expect(link.getAttribute('type')).toBe('image/svg+xml');
  });

  it('restores the original icon when leaving the page', async () => {
    const { unmount } = renderHook(() => useUnreadFavicon(1));
    await waitFor(() => expect(link.getAttribute('href')).toBe(BADGED_HREF));

    unmount();

    expect(link.getAttribute('href')).toBe(ORIGINAL_HREF);
  });

  it('draws the badge on the last declared icon, the one the browser displays', async () => {
    const stray = document.createElement('link');
    stray.rel = 'icon';
    stray.href = '/vite.svg';
    document.head.insertBefore(stray, link);

    renderHook(() => useUnreadFavicon(1));

    await waitFor(() => expect(imageSources).toEqual([expect.stringContaining(ORIGINAL_HREF)]));
    stray.remove();
  });

  it('leaves the icon alone when there is nothing unread', () => {
    renderHook(() => useUnreadFavicon(0));

    expect(link.getAttribute('href')).toBe(ORIGINAL_HREF);
  });

  it('caps the badge label at 99+', async () => {
    await renderBadgedFavicon(ORIGINAL_HREF, 150);

    expect(fakeContext.fillText).toHaveBeenCalledWith('99+', expect.any(Number), expect.any(Number));
  });

  it('gives up silently without a canvas context', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    await expect(renderBadgedFavicon(ORIGINAL_HREF, 1)).resolves.toBeNull();
  });
});
