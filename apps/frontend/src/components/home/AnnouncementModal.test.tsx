import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnnouncementModal } from './AnnouncementModal';

const openModal = vi.hoisted(() => vi.fn());

vi.mock('@codegouvfr/react-dsfr/Modal', () => ({
  createModal: ({ id }: { id: string }) => ({
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
      buttons?: {
        children: React.ReactNode;
        linkProps?: React.AnchorHTMLAttributes<HTMLAnchorElement>;
      }[];
    }) => (
      <div id={id} role="dialog" aria-label={String(title)}>
        <h1>{title}</h1>
        {children}
        {buttons?.map((button) =>
          button.linkProps ? (
            <a key={String(button.children)} {...button.linkProps}>
              {button.children}
            </a>
          ) : null,
        )}
      </div>
    ),
  }),
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe('AnnouncementModal', () => {
  it('opens the announcement after mounting it', async () => {
    render(
      <AnnouncementModal campaign="example-v1" title="Une annonce" focusReturnRef={{ current: null }}>
        Le contenu
      </AnnouncementModal>,
    );

    await waitFor(() => expect(openModal).toHaveBeenCalledOnce());
  });

  it('renders the configured announcement content and optional action', () => {
    render(
      <AnnouncementModal
        campaign="example-v1"
        title="Une annonce"
        action={{ label: 'En savoir plus', href: 'https://example.com/docs' }}
        focusReturnRef={{ current: null }}
      >
        <p>Le contenu de l’annonce.</p>
      </AnnouncementModal>,
    );

    expect(screen.getByRole('dialog', { name: 'Une annonce' })).toBeInTheDocument();
    expect(screen.getByText('Le contenu de l’annonce.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'En savoir plus' })).toHaveAttribute('href', 'https://example.com/docs');
  });

  it('hides only the campaign stored as dismissed', () => {
    window.localStorage.setItem('sirena.announcement.dismissedCampaign', 'example-v1');

    const view = render(
      <AnnouncementModal campaign="example-v1" title="Ancienne annonce" focusReturnRef={{ current: null }}>
        Ancien contenu
      </AnnouncementModal>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    view.rerender(
      <AnnouncementModal campaign="example-v2" title="Nouvelle annonce" focusReturnRef={{ current: null }}>
        Nouveau contenu
      </AnnouncementModal>,
    );
    expect(screen.getByRole('dialog', { name: 'Nouvelle annonce' })).toBeInTheDocument();
  });

  it('restores focus after concealment', async () => {
    const focusReturnRef = createRef<HTMLHeadingElement>();
    render(
      <>
        <h1 ref={focusReturnRef} tabIndex={-1}>
          Tableau de bord des requêtes
        </h1>
        <AnnouncementModal campaign="example-v1" title="Une annonce" focusReturnRef={focusReturnRef}>
          Le contenu
        </AnnouncementModal>
      </>,
    );

    fireEvent(document.getElementById('announcement-modal-example-v1') as HTMLElement, new Event('dsfr.conceal'));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Tableau de bord des requêtes' })).toHaveFocus());
  });

  it('acquits the campaign on every DSFR concealment', () => {
    render(
      <AnnouncementModal campaign="example-v1" title="Une annonce" focusReturnRef={{ current: null }}>
        <p>Le contenu de l’annonce.</p>
      </AnnouncementModal>,
    );

    fireEvent(document.getElementById('announcement-modal-example-v1') as HTMLElement, new Event('dsfr.conceal'));

    expect(window.localStorage.getItem('sirena.announcement.dismissedCampaign')).toBe('example-v1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
