import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useUnreadDocumentTitle } from './useUnreadDocumentTitle';

const BASE_TITLE = 'Requête 2026-09-RF8 - SIRENA';

describe('useUnreadDocumentTitle', () => {
  beforeEach(() => {
    document.title = BASE_TITLE;
  });

  it('announces the unread messages in the tab title', () => {
    renderHook(() => useUnreadDocumentTitle(3));

    expect(document.title).toBe(`3 messages non lus - ${BASE_TITLE}`);
  });

  it('keeps the singular for a lone message', () => {
    renderHook(() => useUnreadDocumentTitle(1));

    expect(document.title).toBe(`1 message non lu - ${BASE_TITLE}`);
  });

  it('gives the title back once everything is read', () => {
    const { rerender } = renderHook(({ count }) => useUnreadDocumentTitle(count), { initialProps: { count: 2 } });

    rerender({ count: 0 });

    expect(document.title).toBe(BASE_TITLE);
  });

  it('restores the original document title when the hook unmounts', () => {
    const { unmount } = renderHook(() => useUnreadDocumentTitle(2));

    unmount();

    expect(document.title).toBe(BASE_TITLE);
  });

  it('puts the prefix back on the title the router just wrote', async () => {
    renderHook(() => useUnreadDocumentTitle(2));
    expect(document.title).toBe(`2 messages non lus - ${BASE_TITLE}`);

    document.title = 'Traitement - Requête 2026-09-RF8 - SIRENA';

    await waitFor(() => expect(document.title).toBe('2 messages non lus - Traitement - Requête 2026-09-RF8 - SIRENA'));
  });

  it('restores the last title written by the router, not the one it started from', async () => {
    const { unmount } = renderHook(() => useUnreadDocumentTitle(2));

    document.title = 'Traitement - Requête 2026-09-RF8 - SIRENA';
    await waitFor(() => expect(document.title).toMatch(/^2 messages non lus - Traitement/));

    unmount();

    expect(document.title).toBe('Traitement - Requête 2026-09-RF8 - SIRENA');
  });

  it('waits for the title the router has not mounted yet', async () => {
    document.head.querySelector('title')?.remove();
    renderHook(() => useUnreadDocumentTitle(2));
    expect(document.title).toBe('2 messages non lus');

    document.title = 'Traitement - Requête 2026-09-RF8 - SIRENA';

    await waitFor(() => expect(document.title).toBe('2 messages non lus - Traitement - Requête 2026-09-RF8 - SIRENA'));
  });

  it('leaves the title of the page being opened alone when the drawer unmounts with it', () => {
    const { unmount } = renderHook(() => useUnreadDocumentTitle(2));
    expect(document.title).toBe(`2 messages non lus - ${BASE_TITLE}`);

    // On a navigation the router writes the new title first, then the drawer of the old page unmounts.
    document.title = 'Traitement - Requête 2026-09-RF8 - SIRENA';
    unmount();

    expect(document.title).toBe('Traitement - Requête 2026-09-RF8 - SIRENA');
  });

  it('leaves the title alone when there is nothing unread', () => {
    renderHook(() => useUnreadDocumentTitle(0));

    expect(document.title).toBe(BASE_TITLE);
  });
});
