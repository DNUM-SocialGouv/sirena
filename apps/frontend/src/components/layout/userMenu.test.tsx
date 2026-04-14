import { ROLES } from '@sirena/common/constants';
import { useMatches } from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useProfile } from '@/hooks/queries/profile.hook';
import { UserMenu } from './userMenu';

vi.mock('@/hooks/queries/profile.hook', () => ({
  useProfile: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  useMatches: vi.fn(),
}));

const mockedUseProfile = vi.mocked(useProfile);
const mockedUseMatches = vi.mocked(useMatches);

function mockProfile(roleId: string) {
  mockedUseProfile.mockReturnValue({
    data: {
      nom: 'Jeanne',
      prenom: 'Dupont',
      email: 'jeanne.dupont@example.fr',
      role: { id: roleId },
      affectationChain: [],
    },
  } as never);
}

async function renderUserMenu({
  roleId = ROLES.ENTITY_ADMIN,
  isAdminRoute = false,
}: {
  roleId?: string;
  isAdminRoute?: boolean;
} = {}) {
  mockProfile(roleId);
  mockedUseMatches.mockReturnValue([{ routeId: isAdminRoute ? '/_auth/admin/users' : '/_auth/_user/home' }] as never);

  render(<UserMenu />);
  await userEvent.click(screen.getByRole('button', { name: /Mon espace/i }));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('UserMenu', () => {
  it('shows an "Espace administrateur" entry with a settings icon for local admins outside the admin area', async () => {
    await renderUserMenu();

    const adminLink = screen.getByRole('link', { name: 'Espace administrateur' });

    expect(adminLink).toHaveAttribute('href', '/admin/users');
    expect(adminLink.className).toContain('fr-icon-settings');
  });
});
