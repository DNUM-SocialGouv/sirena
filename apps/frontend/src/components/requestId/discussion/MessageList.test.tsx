import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { RequeteMessage } from '@/hooks/queries/requeteMessages.hook';
import { MessageList } from './MessageList';

vi.mock('./MessageItem', () => ({
  MessageItem: ({ message }: { message: RequeteMessage }) => <li>{message.contenu}</li>,
}));

const makeMessage = (id: string): RequeteMessage => ({
  id,
  requeteId: 'REQ',
  contenu: `message ${id}`,
  createdAt: '2026-01-15T10:30:00.000Z',
  entite: { id: 'E1', nomComplet: 'ARS Île-de-France', entiteTypeId: 'ARS' },
  author: { prenom: 'jean', nom: 'dupont' },
  isReadByCurrentUser: true,
});

const renderList = (messages: RequeteMessage[], onLoadMore = vi.fn(), hasMore = true) => {
  const view = render(
    <MessageList
      messages={messages}
      ownEntiteId="E1"
      hasMore={hasMore}
      isFetchingNextPage={false}
      onLoadMore={onLoadMore}
    />,
  );

  const rerender = (next: RequeteMessage[]) =>
    view.rerender(
      <MessageList
        messages={next}
        ownEntiteId="E1"
        hasMore={hasMore}
        isFetchingNextPage={false}
        onLoadMore={onLoadMore}
      />,
    );

  return { ...view, rerender };
};

const scrollTo = (scroller: HTMLElement, { scrollTop, scrollHeight, clientHeight }: Record<string, number>) => {
  Object.defineProperty(scroller, 'scrollHeight', { value: scrollHeight, configurable: true });
  Object.defineProperty(scroller, 'clientHeight', { value: clientHeight, configurable: true });
  scroller.scrollTop = scrollTop;
  fireEvent.scroll(scroller);
};

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('MessageList', () => {
  const liveRegion = (container: HTMLElement) => container.querySelector('.fr-sr-only[aria-live="polite"]');

  it('renders nothing but the live region when there is no message', () => {
    renderList([]);

    expect(screen.queryByRole('region', { name: 'Messages de la discussion' })).not.toBeInTheDocument();
  });

  it('keeps the live region mounted while the thread is empty', () => {
    const { container } = renderList([]);

    expect(liveRegion(container)).toBeInTheDocument();
    expect(liveRegion(container)).toHaveTextContent('');
  });

  it('never announces a page of older messages', () => {
    const { container, rerender } = renderList([makeMessage('m2'), makeMessage('m3')]);

    const scroller = screen.getByRole('region', { name: 'Messages de la discussion' });
    scrollTo(scroller, { scrollTop: 0, scrollHeight: 1000, clientHeight: 300 });
    fireEvent.click(screen.getByRole('button', { name: 'Charger les messages précédents' }));

    Object.defineProperty(scroller, 'scrollHeight', { value: 1400, configurable: true });
    rerender([makeMessage('m1'), makeMessage('m2'), makeMessage('m3')]);

    expect(liveRegion(container)).toHaveTextContent('');
  });

  it('announces only the message that just arrived at the bottom', () => {
    const { container, rerender } = renderList([makeMessage('m1')]);

    rerender([makeMessage('m1'), makeMessage('m2')]);

    expect(liveRegion(container)).toHaveTextContent('Nouveau message de ARS Île-de-France');
  });

  it('keeps the "unread" line where the agent found it, even once the messages are marked read', () => {
    const unread = (id: string) => ({ ...makeMessage(id), isReadByCurrentUser: false });
    const { rerender } = renderList([makeMessage('m1'), unread('m2'), unread('m3')]);

    expect(screen.getByText('Non lus').closest('li')?.nextElementSibling?.textContent).toContain('message m2');

    rerender([makeMessage('m1'), makeMessage('m2'), makeMessage('m3')]);

    expect(screen.getByText('Non lus').closest('li')?.nextElementSibling?.textContent).toContain('message m2');
  });

  it('moves the "unread" line up when an older page reveals unread messages above it', () => {
    const unread = (id: string) => ({ ...makeMessage(id), isReadByCurrentUser: false });
    const { rerender } = renderList([unread('m3'), unread('m4')]);

    expect(screen.getByText('Non lus').closest('li')?.nextElementSibling?.textContent).toContain('message m3');

    rerender([makeMessage('m1'), unread('m2'), unread('m3'), unread('m4')]);

    expect(screen.getByText('Non lus').closest('li')?.nextElementSibling?.textContent).toContain('message m2');
  });

  it('re-anchors to the bottom when the thread is emptied and filled again', () => {
    const { rerender } = renderList([makeMessage('m1'), makeMessage('m2')]);
    vi.mocked(Element.prototype.scrollIntoView).mockClear();

    rerender([]);
    rerender([makeMessage('m1'), makeMessage('m2')]);

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('loads the previous page and keeps the reading position anchored', () => {
    const onLoadMore = vi.fn();
    const { rerender } = renderList([makeMessage('m2'), makeMessage('m3')], onLoadMore);

    const scroller = screen.getByRole('region', { name: 'Messages de la discussion' });
    scrollTo(scroller, { scrollTop: 0, scrollHeight: 1000, clientHeight: 300 });

    fireEvent.click(screen.getByRole('button', { name: 'Charger les messages précédents' }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    Object.defineProperty(scroller, 'scrollHeight', { value: 1400, configurable: true });
    rerender([makeMessage('m1'), makeMessage('m2'), makeMessage('m3')]);

    expect(scroller.scrollTop).toBe(400);
    expect(screen.queryByRole('button', { name: 'Nouveaux messages' })).not.toBeInTheDocument();
  });

  it('announces new messages when one arrives while the user is scrolled up', () => {
    const { rerender } = renderList([makeMessage('m1'), makeMessage('m2')]);

    const scroller = screen.getByRole('region', { name: 'Messages de la discussion' });
    scrollTo(scroller, { scrollTop: 0, scrollHeight: 1000, clientHeight: 300 });

    rerender([makeMessage('m1'), makeMessage('m2'), makeMessage('m3')]);

    expect(screen.getByRole('button', { name: 'Nouveaux messages' })).toBeInTheDocument();
  });

  it('scrolls to the bottom instead of announcing when the user already follows the thread', () => {
    const { rerender } = renderList([makeMessage('m1'), makeMessage('m2')]);

    const scroller = screen.getByRole('region', { name: 'Messages de la discussion' });
    scrollTo(scroller, { scrollTop: 700, scrollHeight: 1000, clientHeight: 300 });

    rerender([makeMessage('m1'), makeMessage('m2'), makeMessage('m3')]);

    expect(screen.queryByRole('button', { name: 'Nouveaux messages' })).not.toBeInTheDocument();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
