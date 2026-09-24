import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DiscussionDrawer } from './DiscussionDrawer';

const markReadMutate = vi.fn();

let discussionFeatureEnabled = true;

vi.mock('@/hooks/useHasFeature', () => ({
  useHasFeature: () => discussionFeatureEnabled,
}));

vi.mock('@/hooks/mutations/markRequeteDiscussionRead.hook', () => ({
  useMarkRequeteDiscussionRead: () => ({ mutate: markReadMutate, isPending: false }),
}));

vi.mock('./Discussion', () => ({
  Discussion: () => <div data-testid="discussion-thread" />,
}));

describe('DiscussionDrawer', () => {
  beforeEach(() => {
    discussionFeatureEnabled = true;
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

    const openPanel = () => fireEvent.click(screen.getByRole('button', { name: 'Ouvrir la discussion' }));

    it('marks the pending messages as read after a short delay when the window has focus', async () => {
      vi.spyOn(document, 'hasFocus').mockReturnValue(true);
      render(<DiscussionDrawer requestId="REQ" />);

      openPanel();
      expect(markReadMutate).not.toHaveBeenCalled();

      act(() => vi.advanceTimersByTime(2000));

      expect(markReadMutate).toHaveBeenCalledTimes(1);
    });

    it('waits for the window to regain focus before reading', async () => {
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
});
