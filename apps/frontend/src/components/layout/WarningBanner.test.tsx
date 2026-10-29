import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHasFeature } from '@/hooks/useHasFeature';
import { clearWarningBannerDismissal } from '@/lib/warningBannerDismissal';
import { WarningBanner } from './WarningBanner';

vi.mock('@/hooks/useHasFeature', () => ({
  useHasFeature: vi.fn(),
}));

vi.mock('./warningBannerContent', () => ({
  WARNING_BANNER_CONTENT: {
    title: 'Migration technique',
    description: 'Merci d’anticiper cette interruption.',
    link: { href: 'https://example.gouv.fr/migration', text: 'En savoir plus' },
  },
}));

const mockedUseHasFeature = vi.mocked(useHasFeature);
const STORAGE_KEY = 'sirena.warningBanner.dismissed';

beforeEach(() => {
  window.sessionStorage.clear();
  clearWarningBannerDismissal();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('WarningBanner', () => {
  it('renders nothing when the feature flag is disabled', () => {
    mockedUseHasFeature.mockReturnValue(false);

    const { container } = render(<WarningBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the warning notice when the flag is enabled', () => {
    mockedUseHasFeature.mockReturnValue(true);

    const { container } = render(<WarningBanner />);

    expect(screen.getByText('Migration technique')).toBeInTheDocument();
    expect(screen.getByText(/Merci d’anticiper cette interruption/)).toBeInTheDocument();
    expect(container.querySelector('.fr-notice--warning')).not.toBeNull();
  });

  it('opens the consultation link in a new tab and says so', () => {
    mockedUseHasFeature.mockReturnValue(true);

    render(<WarningBanner />);

    const link = screen.getByRole('link', { name: /En savoir plus/i });
    expect(link).toHaveAttribute('href', 'https://example.gouv.fr/migration');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAccessibleName(/nouvelle fenêtre/i);
  });

  it('does not render when it was already dismissed in this browsing session', () => {
    mockedUseHasFeature.mockReturnValue(true);
    window.sessionStorage.setItem(STORAGE_KEY, 'true');

    const { container } = render(<WarningBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('hides the banner and remembers the dismissal for the session', async () => {
    mockedUseHasFeature.mockReturnValue(true);

    render(<WarningBanner />);
    await userEvent.click(screen.getByRole('button', { name: /masquer le message/i }));

    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe('true');
    expect(screen.queryByText('Migration technique')).not.toBeInTheDocument();
  });

  it('moves the focus to the main content when dismissed', async () => {
    mockedUseHasFeature.mockReturnValue(true);
    const main = document.createElement('main');
    main.id = 'main';
    main.tabIndex = -1;
    document.body.appendChild(main);

    render(<WarningBanner />);
    await userEvent.click(screen.getByRole('button', { name: /masquer le message/i }));

    expect(document.activeElement).toBe(main);
    main.remove();
  });

  // The layout keeps the banner mounted across client-side navigations, so clearing the dismissal
  // elsewhere — on reaching /login — has to bring it back without a full page load.
  it('shows again when the dismissal is cleared while it is mounted', async () => {
    mockedUseHasFeature.mockReturnValue(true);

    render(<WarningBanner />);
    await userEvent.click(screen.getByRole('button', { name: /masquer le message/i }));
    expect(screen.queryByText('Migration technique')).not.toBeInTheDocument();

    act(() => {
      clearWarningBannerDismissal();
    });

    expect(screen.getByText('Migration technique')).toBeInTheDocument();
  });

  it('still renders when session storage reads throw (e.g. blocked storage)', () => {
    mockedUseHasFeature.mockReturnValue(true);
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: sessionStorage access denied');
    });

    render(<WarningBanner />);

    expect(screen.getByText('Migration technique')).toBeInTheDocument();
    getItemSpy.mockRestore();
  });

  it('hides the banner without throwing when session storage writes fail on dismiss', async () => {
    mockedUseHasFeature.mockReturnValue(true);
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    render(<WarningBanner />);
    await userEvent.click(screen.getByRole('button', { name: /masquer le message/i }));

    expect(screen.queryByText('Migration technique')).not.toBeInTheDocument();
    setItemSpy.mockRestore();
  });
});
