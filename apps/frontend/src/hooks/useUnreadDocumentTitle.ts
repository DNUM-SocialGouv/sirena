import { useEffect } from 'react';

export const unreadTitle = (count: number, title: string) =>
  count > 0 ? `${count} ${count > 1 ? 'messages non lus' : 'message non lu'} - ${title}` : title;

export function useUnreadDocumentTitle(count: number) {
  useEffect(() => {
    if (count <= 0) return;

    let baseTitle = document.title;
    document.title = unreadTitle(count, baseTitle);

    const titleElement = document.querySelector('title');
    if (!titleElement) return;

    // The router rewrites the title on every navigation: the prefix has to be put back on the new one.
    const observer = new MutationObserver(() => {
      if (document.title === unreadTitle(count, baseTitle)) return;
      baseTitle = document.title;
      document.title = unreadTitle(count, baseTitle);
    });
    observer.observe(titleElement, { childList: true, characterData: true, subtree: true });

    return () => {
      observer.disconnect();
      document.title = baseTitle;
    };
  }, [count]);
}
