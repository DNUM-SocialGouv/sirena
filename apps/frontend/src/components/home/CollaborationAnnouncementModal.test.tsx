import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHasFeature } from '@/hooks/useHasFeature';
import { CollaborationAnnouncementModal } from './CollaborationAnnouncementModal';

const openModal = vi.hoisted(() => vi.fn());

vi.mock('@codegouvfr/react-dsfr/Modal', () => ({
  createModal: () => {
    const id = 'collaboration-announcement-modal';

    return {
      id,
      open: openModal,
      close: vi.fn(),
      Component: ({
        title,
        children,
        buttons,
      }: {
        title: React.ReactNode;
        children: React.ReactNode;
        buttons: {
          children: React.ReactNode;
          linkProps?: React.AnchorHTMLAttributes<HTMLAnchorElement>;
        }[];
      }) => (
        <div id={id} role="dialog" aria-label={String(title)}>
          <h1>{title}</h1>
          {children}
          {buttons.map((button) =>
            button.linkProps ? (
              <a key={String(button.children)} {...button.linkProps}>
                {button.children}
              </a>
            ) : null,
          )}
        </div>
      ),
    };
  },
}));

vi.mock('@/hooks/useHasFeature', () => ({
  useHasFeature: vi.fn(),
}));

const mockedUseHasFeature = vi.mocked(useHasFeature);
const STORAGE_KEY = 'sirena.collaborationAnnouncement.dismissedCampaign';
const noFocusReturnRef = { current: null };

beforeEach(() => {
  window.localStorage.clear();
  openModal.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('CollaborationAnnouncementModal', () => {
  it('renders nothing when shared processing steps are disabled or unavailable', () => {
    mockedUseHasFeature.mockReturnValue(false);

    const { container } = render(<CollaborationAnnouncementModal focusReturnRef={noFocusReturnRef} />);

    expect(container).toBeEmptyDOMElement();
    expect(openModal).not.toHaveBeenCalled();
  });

  it('opens an accessible collaboration announcement with the release-notes link when shared processing steps are enabled', () => {
    mockedUseHasFeature.mockReturnValue(true);

    render(<CollaborationAnnouncementModal focusReturnRef={noFocusReturnRef} />);

    expect(openModal).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Collaborez plus facilement sur SIRENA' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir les nouveautés' })).toHaveAttribute(
      'href',
      'https://docs.numerique.gouv.fr/docs/24ca6ea9-c64d-4e30-8555-626166cb2d45/',
    );
  });

  it('does not open when the current campaign was already dismissed', () => {
    mockedUseHasFeature.mockReturnValue(true);
    window.localStorage.setItem(STORAGE_KEY, 'collaboration-v1');

    const { container } = render(<CollaborationAnnouncementModal focusReturnRef={noFocusReturnRef} />);

    expect(container).toBeEmptyDOMElement();
    expect(openModal).not.toHaveBeenCalled();
  });

  it('opens when a different campaign was previously dismissed', () => {
    mockedUseHasFeature.mockReturnValue(true);
    window.localStorage.setItem(STORAGE_KEY, 'collaboration-v0');

    render(<CollaborationAnnouncementModal focusReturnRef={noFocusReturnRef} />);

    expect(openModal).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('acquits every DSFR concealment and stays hidden after a remount', () => {
    mockedUseHasFeature.mockReturnValue(true);

    const firstRender = render(<CollaborationAnnouncementModal focusReturnRef={noFocusReturnRef} />);
    fireEvent(document.getElementById('collaboration-announcement-modal') as HTMLElement, new Event('dsfr.conceal'));

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('collaboration-v1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    firstRender.unmount();
    const secondRender = render(<CollaborationAnnouncementModal focusReturnRef={noFocusReturnRef} />);
    expect(secondRender.container).toBeEmptyDOMElement();
  });

  it('still renders when localStorage reads fail', () => {
    mockedUseHasFeature.mockReturnValue(true);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    render(<CollaborationAnnouncementModal focusReturnRef={noFocusReturnRef} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes for the current render and reappears after a remount when localStorage writes fail', () => {
    mockedUseHasFeature.mockReturnValue(true);
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const firstRender = render(<CollaborationAnnouncementModal focusReturnRef={noFocusReturnRef} />);
    fireEvent(document.getElementById('collaboration-announcement-modal') as HTMLElement, new Event('dsfr.conceal'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEY, 'collaboration-v1');

    firstRender.unmount();
    render(<CollaborationAnnouncementModal focusReturnRef={noFocusReturnRef} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('preserves an acquittal when shared processing steps are disabled and re-enabled', () => {
    window.localStorage.setItem(STORAGE_KEY, 'collaboration-v1');
    mockedUseHasFeature.mockReturnValue(true);

    const view = render(<CollaborationAnnouncementModal focusReturnRef={noFocusReturnRef} />);
    expect(view.container).toBeEmptyDOMElement();

    mockedUseHasFeature.mockReturnValue(false);
    view.rerender(<CollaborationAnnouncementModal focusReturnRef={noFocusReturnRef} />);
    mockedUseHasFeature.mockReturnValue(true);
    view.rerender(<CollaborationAnnouncementModal focusReturnRef={noFocusReturnRef} />);

    expect(view.container).toBeEmptyDOMElement();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('collaboration-v1');
  });

  it('restores focus to the home-page heading after concealment', async () => {
    mockedUseHasFeature.mockReturnValue(true);
    const focusReturnRef = createRef<HTMLHeadingElement>();

    render(
      <>
        <h1 ref={focusReturnRef} tabIndex={-1}>
          Tableau de bord des requêtes
        </h1>
        <CollaborationAnnouncementModal focusReturnRef={focusReturnRef} />
      </>,
    );
    fireEvent(document.getElementById('collaboration-announcement-modal') as HTMLElement, new Event('dsfr.conceal'));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Tableau de bord des requêtes' })).toHaveFocus());
  });
});
