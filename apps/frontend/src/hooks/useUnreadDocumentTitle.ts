import { useEffect } from 'react';

export const unreadTitle = (count: number, title: string) =>
  count > 0 ? `${count} ${count > 1 ? 'messages non lus' : 'message non lu'} - ${title}` : title;

export function useUnreadDocumentTitle(count: number) {
  useEffect(() => {
    if (count <= 0) return;

    const title = document.title;
    document.title = unreadTitle(count, title);

    return () => {
      document.title = title;
    };
  }, [count]);
}
