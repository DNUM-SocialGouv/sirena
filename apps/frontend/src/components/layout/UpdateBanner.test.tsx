import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHasFeature } from '@/hooks/useHasFeature';
import { UpdateBanner } from './UpdateBanner';

vi.mock('@/hooks/useHasFeature', () => ({
  useHasFeature: vi.fn(),
}));

vi.mock('@/config/version.constant', () => ({
  APP_VERSION: '1.2.3',
}));

const mockedUseHasFeature = vi.mocked(useHasFeature);
const STORAGE_KEY = 'sirena.updateBanner.dismissedVersion';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('UpdateBanner', () => {
  it('renders nothing when the feature flag is disabled', () => {
    mockedUseHasFeature.mockReturnValue(false);

    const { container } = render(<UpdateBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the banner with a link to the release notes when the flag is enabled', () => {
    mockedUseHasFeature.mockReturnValue(true);

    render(<UpdateBanner />);

    expect(screen.getByText('Nouvelle mise à jour')).toBeInTheDocument();
    expect(screen.getByText(/Découvrez les dernières fonctionnalités/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /En savoir plus/i })).toHaveAttribute(
      'href',
      expect.stringMatching(/^https?:\/\//),
    );
  });

  it('does not render when the current version is already dismissed', () => {
    mockedUseHasFeature.mockReturnValue(true);
    window.localStorage.setItem(STORAGE_KEY, '1.2.3');

    const { container } = render(<UpdateBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders again when a different version was previously dismissed', () => {
    mockedUseHasFeature.mockReturnValue(true);
    window.localStorage.setItem(STORAGE_KEY, '1.0.0');

    render(<UpdateBanner />);

    expect(screen.getByText('Nouvelle mise à jour')).toBeInTheDocument();
  });

  it('persists the current version in localStorage and hides the banner when dismissed', async () => {
    mockedUseHasFeature.mockReturnValue(true);

    render(<UpdateBanner />);

    expect(screen.getByText('Nouvelle mise à jour')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /masquer le message/i }));

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('1.2.3');
    expect(screen.queryByText('Nouvelle mise à jour')).not.toBeInTheDocument();
  });

  it('still renders when localStorage reads throw (e.g. blocked storage)', () => {
    mockedUseHasFeature.mockReturnValue(true);
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: localStorage access denied');
    });

    render(<UpdateBanner />);

    expect(screen.getByText('Nouvelle mise à jour')).toBeInTheDocument();
    getItemSpy.mockRestore();
  });

  it('hides the banner without throwing when localStorage writes fail on dismiss', async () => {
    mockedUseHasFeature.mockReturnValue(true);
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    render(<UpdateBanner />);
    await userEvent.click(screen.getByRole('button', { name: /masquer le message/i }));

    expect(screen.queryByText('Nouvelle mise à jour')).not.toBeInTheDocument();
    setItemSpy.mockRestore();
  });
});
