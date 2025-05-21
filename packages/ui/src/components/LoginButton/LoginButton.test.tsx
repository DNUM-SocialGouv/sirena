import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginButton } from './LoginButton.tsx';

describe('LoginButton Component', () => {
  beforeEach(() => {
    const mockResponse = { authorization_endpoint: 'https://authorization_endpoint' };

    // Mock fetch avec Response natif
    global.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: new Headers({ 'Content-Type': 'application/json' }),
        }),
      ),
    );
    // Mock avec un format UUID valide
    global.self.crypto.randomUUID = vi.fn(
      () => '12345678-1234-1234-1234-123456789abc' as `${string}-${string}-${string}-${string}-${string}`,
    );
    vi.stubEnv('VITE_PROCONNECT_DOMAIN', 'VITE_PROCONNECT_DOMAIN');
    vi.stubEnv('VITE_PROCONNECT_REDIRECT_URI', 'VITE_PROCONNECT_REDIRECT_URI');
    vi.stubEnv('VITE_PROCONNECT_CLIENT_ID', 'VITE_PROCONNECT_CLIENT_ID');
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('renders the button as a link', () => {
    render(<LoginButton />);
    expect(screen.getByRole('link', { name: 'S’identifier avec ProConnect' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Qu’est-ce que ProConnect ?' })).toBeInTheDocument();
  });

  it('have link # by default', () => {
    render(<LoginButton />);
    expect(screen.getByRole('link', { name: 'S’identifier avec ProConnect' })).toHaveAttribute('href', '#');
  });

  it('have the correct link after change', async () => {
    render(<LoginButton />);
    const uuid = '12345678-1234-1234-1234-123456789abc';
    const generatedUrl = `https://authorization_endpoint?state=${uuid}&nonce=${uuid}&redirect_uri=VITE_PROCONNECT_REDIRECT_URI&client_id=VITE_PROCONNECT_CLIENT_ID&scope=uid+openid+given_name+usual_name+siret+email+organizational_unit&response_type=code`;
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'S’identifier avec ProConnect' })).toHaveAttribute('href', generatedUrl);
    });
  });
});
