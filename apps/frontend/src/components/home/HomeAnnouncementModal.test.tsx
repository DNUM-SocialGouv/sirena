import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHasFeature } from '@/hooks/useHasFeature';
import { HomeAnnouncementModal } from './HomeAnnouncementModal';

vi.mock('@codegouvfr/react-dsfr/Modal', () => ({
  createModal: ({ id }: { id: string }) => ({
    id,
    open: vi.fn(),
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

vi.mock('@/hooks/useHasFeature', () => ({
  useHasFeature: vi.fn(),
}));

const mockedUseHasFeature = vi.mocked(useHasFeature);
const STORAGE_KEY = 'sirena.announcement.dismissedCampaign';
beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('HomeAnnouncementModal', () => {
  it('renders nothing when shared processing steps are disabled or unavailable', () => {
    mockedUseHasFeature.mockReturnValue(false);

    const { container } = render(<HomeAnnouncementModal />);

    expect(container).toBeEmptyDOMElement();
  });

  it('does not render when the collaboration campaign was already dismissed', () => {
    mockedUseHasFeature.mockReturnValue(true);
    window.localStorage.setItem(STORAGE_KEY, 'collaboration-v1');

    const { container } = render(<HomeAnnouncementModal />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the current campaign when an older campaign was dismissed', () => {
    mockedUseHasFeature.mockReturnValue(true);
    window.localStorage.setItem(STORAGE_KEY, 'ancienne-campagne-v1');

    render(<HomeAnnouncementModal />);

    expect(screen.getByRole('dialog', { name: 'De nouvelles fonctionnalités sont disponibles !' })).toBeInTheDocument();
  });

  it('renders the collaboration content, accessible list and documentation link', () => {
    mockedUseHasFeature.mockReturnValue(true);

    render(<HomeAnnouncementModal />);

    const changes = screen.getAllByRole('listitem');
    expect(changes).toHaveLength(3);
    expect(changes[0]).toHaveTextContent(
      'Vous pouvez toujours ajouter et modifier vos propres étapes, et désormais choisir de les afficher ou non pour toutes les entités affectées à la requête ;',
    );
    expect(changes[1]).toHaveTextContent('Vous pouvez visualiser les étapes ajoutées par les autres entités ;');
    expect(changes[2]).toHaveTextContent('Vous pouvez filtrer les étapes par entité.');
    for (const star of screen.getAllByText('⭐')) expect(star).toHaveAttribute('aria-hidden', 'true');

    const documentationLink = screen.getByRole('link', { name: 'Voir la documentation - nouvel onglet' });
    expect(screen.getByText('- nouvel onglet')).toHaveClass('fr-sr-only');
    expect(documentationLink).toHaveAttribute(
      'href',
      'https://docs.numerique.gouv.fr/docs/ecc192e9-8d57-4782-b40d-3f5346786b52/',
    );
    expect(documentationLink).toHaveAttribute('target', '_blank');
    expect(documentationLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
