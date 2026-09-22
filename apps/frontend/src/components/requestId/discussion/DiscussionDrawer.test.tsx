import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnreadDocumentTitle } from '@/hooks/useUnreadDocumentTitle';
import { DiscussionDrawer } from './DiscussionDrawer';

const markReadMutate = vi.fn();

let discussionFeatureEnabled = true;
let unreadCount = 0;

vi.mock('@/hooks/useHasFeature', () => ({
  useHasFeature: () => discussionFeatureEnabled,
}));

vi.mock('@/hooks/queries/requeteMessagesUnread.hook', () => ({
  useRequeteUnreadCount: () => ({ data: unreadCount }),
}));

vi.mock('@/hooks/mutations/markRequeteDiscussionRead.hook', () => ({
  useMarkRequeteDiscussionRead: () => ({ mutate: markReadMutate, isPending: false }),
}));

vi.mock('@/hooks/useUnreadDocumentTitle', () => ({
  useUnreadDocumentTitle: vi.fn(),
}));

vi.mock('./Discussion', () => ({
  Discussion: () => <div data-testid="discussion-thread" />,
}));

describe('DiscussionDrawer', () => {
  beforeEach(() => {
    discussionFeatureEnabled = true;
    unreadCount = 0;
    markReadMutate.mockReset();
  });

  it('shows the "Ouvrir la discussion" button', () => {
    render(<DiscussionDrawer requestId="REQ" />);

    expect(screen.getByRole('button', { name: 'Ouvrir la discussion' })).toBeInTheDocument();
  });

  it('renders nothing while the feature flag is off', () => {
    discussionFeatureEnabled = false;

    render(<DiscussionDrawer requestId="REQ" />);

    expect(screen.queryByRole('button', { name: 'Ouvrir la discussion' })).not.toBeInTheDocument();
  });

  it('opens the panel with its title and the thread', async () => {
    const user = userEvent.setup();
    render(<DiscussionDrawer requestId="REQ" />);

    await user.click(screen.getByRole('button', { name: 'Ouvrir la discussion' }));

    expect(await screen.findByRole('heading', { name: 'Discussion' })).toBeInTheDocument();
    expect(screen.getByTestId('discussion-thread')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ouvrir la discussion' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('marks the discussion as read when the panel is closed', async () => {
    const user = userEvent.setup();
    render(<DiscussionDrawer requestId="REQ" />);

    await user.click(screen.getByRole('button', { name: 'Ouvrir la discussion' }));
    expect(markReadMutate).not.toHaveBeenCalled();

    await user.click(await screen.findByRole('button', { name: 'Fermer' }));

    expect(markReadMutate).toHaveBeenCalledTimes(1);
  });

  it('also marks the discussion as read when the panel is closed with Escape', async () => {
    const user = userEvent.setup();
    render(<DiscussionDrawer requestId="REQ" />);

    await user.click(screen.getByRole('button', { name: 'Ouvrir la discussion' }));
    await user.keyboard('{Escape}');

    expect(markReadMutate).toHaveBeenCalledTimes(1);
  });

  describe('reading while the panel is open', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    const openPanel = () => fireEvent.click(screen.getByRole('button', { name: /^Ouvrir la discussion/ }));

    it('marks the pending messages as read after a short delay when the window has focus', async () => {
      unreadCount = 2;
      vi.spyOn(document, 'hasFocus').mockReturnValue(true);
      render(<DiscussionDrawer requestId="REQ" />);

      openPanel();
      expect(markReadMutate).not.toHaveBeenCalled();

      act(() => vi.advanceTimersByTime(2000));

      expect(markReadMutate).toHaveBeenCalledTimes(1);
    });

    it('waits for the window to regain focus before reading', async () => {
      unreadCount = 2;
      vi.spyOn(document, 'hasFocus').mockReturnValue(false);
      render(<DiscussionDrawer requestId="REQ" />);

      openPanel();
      act(() => vi.advanceTimersByTime(2000));
      expect(markReadMutate).not.toHaveBeenCalled();

      vi.spyOn(document, 'hasFocus').mockReturnValue(true);
      act(() => window.dispatchEvent(new Event('focus')));
      act(() => vi.advanceTimersByTime(2000));

      expect(markReadMutate).toHaveBeenCalledTimes(1);
    });

    it('does nothing while there is nothing unread', async () => {
      unreadCount = 0;
      vi.spyOn(document, 'hasFocus').mockReturnValue(true);
      render(<DiscussionDrawer requestId="REQ" />);

      openPanel();
      act(() => vi.advanceTimersByTime(5000));

      expect(markReadMutate).not.toHaveBeenCalled();
    });
  });

  it('does not mark anything if the panel was never opened', () => {
    const { unmount } = render(<DiscussionDrawer requestId="REQ" />);

    unmount();

    expect(markReadMutate).not.toHaveBeenCalled();
  });

  it('treats leaving the page with the panel open as closing it', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<DiscussionDrawer requestId="REQ" />);

    await user.click(screen.getByRole('button', { name: 'Ouvrir la discussion' }));
    unmount();

    expect(markReadMutate).toHaveBeenCalledTimes(1);
  });

  it('carries the unread count inside the button, spelled out for assistive tech', () => {
    unreadCount = 3;

    render(<DiscussionDrawer requestId="REQ" />);

    const button = screen.getByRole('button', { name: 'Ouvrir la discussion 3 messages non lus' });
    expect(button).toHaveTextContent('Ouvrir la discussion 3');
  });

  it('announces the messages that arrive, not the running total', () => {
    unreadCount = 0;
    const { container, rerender } = render(<DiscussionDrawer requestId="REQ" />);
    const liveRegion = container.querySelector('p.fr-sr-only[aria-live="polite"]');
    expect(liveRegion).toHaveTextContent('');

    unreadCount = 1;
    rerender(<DiscussionDrawer requestId="REQ" />);
    expect(liveRegion).toHaveTextContent('Nouveau message dans la discussion');

    unreadCount = 3;
    rerender(<DiscussionDrawer requestId="REQ" />);
    expect(liveRegion).toHaveTextContent('2 nouveaux messages dans la discussion');
  });

  it('says nothing when the messages are read', () => {
    unreadCount = 2;
    const { container, rerender } = render(<DiscussionDrawer requestId="REQ" />);

    unreadCount = 0;
    rerender(<DiscussionDrawer requestId="REQ" />);

    expect(container.querySelector('p.fr-sr-only[aria-live="polite"]')).toHaveTextContent('');
  });

  it('carries the unread count in the tab title', () => {
    unreadCount = 3;

    render(<DiscussionDrawer requestId="REQ" />);

    expect(useUnreadDocumentTitle).toHaveBeenLastCalledWith(3);
  });

  it('keeps the live region silent while the panel is open', async () => {
    unreadCount = 3;
    const user = userEvent.setup();

    const { container } = render(<DiscussionDrawer requestId="REQ" />);
    await user.click(screen.getByRole('button', { name: /^Ouvrir la discussion/ }));

    const liveRegion = container.querySelector('p.fr-sr-only[aria-live="polite"]');
    expect(liveRegion).toHaveTextContent('');
  });
});
