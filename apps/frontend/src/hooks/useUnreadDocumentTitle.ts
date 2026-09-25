import { useEffect } from 'react';

const UNREAD_PREFIX = /^\d+ messages? non lus?\s*-?\s*/;

export const unreadTitle = (count: number, title: string) => {
  if (count <= 0) return title;
  const label = `${count} ${count > 1 ? 'messages non lus' : 'message non lu'}`;
  return title ? `${label} - ${title}` : label;
};

// The title read back is not always the string that was written (browsers trim it), and the prefix must
// never be applied twice.
const baseOf = (title: string) => title.replace(UNREAD_PREFIX, '');

export function useUnreadDocumentTitle(count: number) {
  useEffect(() => {
    if (count <= 0) return;

    let baseTitle = baseOf(document.title);
    document.title = unreadTitle(count, baseTitle);

    // The router owns the title element: it can be mounted after this effect, replaced by another one, or
    // rewritten on the next navigation. Watching the head covers the three, wherever the element is.
    const observer = new MutationObserver(() => {
      if (document.title === unreadTitle(count, baseTitle)) return;
      baseTitle = baseOf(document.title);
      document.title = unreadTitle(count, baseTitle);
    });
    observer.observe(document.head, { childList: true, characterData: true, subtree: true });

    return () => {
      observer.disconnect();
      // Navigating unmounts the drawer after the router has written the title of the page being opened:
      // putting the previous one back here would undo that, and nothing would rewrite it afterwards.
      if (document.title === unreadTitle(count, baseTitle)) document.title = baseTitle;
    };
  }, [count]);
}
