import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnvironmentBanner } from './EnvironmentBanner';

const { mockEnv } = vi.hoisted(() => ({ mockEnv: { APP_ENV: '' } }));

vi.mock('@/config/env', () => ({ env: mockEnv }));

afterEach(() => {
  cleanup();
  mockEnv.APP_ENV = '';
});

describe('EnvironmentBanner', () => {
  it('renders nothing when APP_ENV is not set', () => {
    const { container } = render(<EnvironmentBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing in production', () => {
    mockEnv.APP_ENV = 'production';

    const { container } = render(<EnvironmentBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the localized environment label', () => {
    mockEnv.APP_ENV = 'integration';

    render(<EnvironmentBanner />);

    expect(screen.getByText(/environnement de test \(intégration\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Ne saisissez pas de données réelles/i)).toBeInTheDocument();
  });

  it('renders the banner with the DSFR warning severity', () => {
    mockEnv.APP_ENV = 'validation';

    render(<EnvironmentBanner />);

    expect(screen.getByText(/environnement de test/i).closest('.fr-notice')).toHaveClass('fr-notice--warning');
  });
});
