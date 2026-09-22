import { renderHook } from '@testing-library/react';
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

  it('gives the title back when leaving the page', () => {
    const { unmount } = renderHook(() => useUnreadDocumentTitle(2));

    unmount();

    expect(document.title).toBe(BASE_TITLE);
  });

  it('leaves the title alone when there is nothing unread', () => {
    renderHook(() => useUnreadDocumentTitle(0));

    expect(document.title).toBe(BASE_TITLE);
  });
});
