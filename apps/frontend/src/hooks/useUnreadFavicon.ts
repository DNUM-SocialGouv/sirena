import { useEffect } from 'react';

const SIZE = 64;
const BADGE_COLOR = '#ce0500';

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

export const renderBadgedFavicon = async (baseHref: string, count: number): Promise<string | null> => {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext('2d');
  if (!context) return null;

  try {
    context.drawImage(await loadImage(baseHref), 0, 0, SIZE, SIZE);
  } catch {
    // The base icon could not be drawn: the badge alone still carries the information.
  }

  const label = count > 99 ? '99+' : String(count);
  const radius = label.length > 2 ? 22 : 18;
  const center = { x: SIZE - radius, y: radius };

  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.fillStyle = BADGE_COLOR;
  context.fill();
  context.lineWidth = 3;
  context.strokeStyle = '#ffffff';
  context.stroke();

  context.fillStyle = '#ffffff';
  context.font = `bold ${label.length > 2 ? 18 : 24}px Marianne, Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, center.x, center.y + 1);

  return canvas.toDataURL('image/png');
};

export function useUnreadFavicon(count: number) {
  useEffect(() => {
    if (count <= 0) return;

    const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
    const baseLink = links.at(-1);
    if (!baseLink) return;

    const originals = links.map((link) => ({ href: link.getAttribute('href'), type: link.getAttribute('type') }));
    let cancelled = false;

    void renderBadgedFavicon(baseLink.href, count).then((dataUrl) => {
      if (cancelled || !dataUrl) return;
      for (const link of links) {
        link.href = dataUrl;
        link.type = 'image/png';
      }
    });

    return () => {
      cancelled = true;
      links.forEach((link, index) => {
        const original = originals[index];
        if (!original) return;
        if (original.href === null) link.removeAttribute('href');
        else link.setAttribute('href', original.href);
        if (original.type === null) link.removeAttribute('type');
        else link.setAttribute('type', original.type);
      });
    };
  }, [count]);
}
