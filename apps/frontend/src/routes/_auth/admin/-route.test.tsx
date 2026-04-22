import { ROLES } from '@sirena/common/constants';
import { useMatches, useNavigate } from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProfile } from '@/hooks/queries/profile.hook';
import { RouteComponent } from './route';

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  Navigate: ({ to }: { to: string }) => <div>redirect:{to}</div>,
  Outlet: () => null,
  useMatches: vi.fn(),
  useNavigate: vi.fn(),
}));

vi.mock('@/hooks/queries/profile.hook', () => ({
  useProfile: vi.fn(),
}));

const mockedUseMatches = vi.mocked(useMatches);
const mockedUseNavigate = vi.mocked(useNavigate);
const mockedUseProfile = vi.mocked(useProfile);

function mockRole(roleId: string) {
  mockedUseProfile.mockReturnValue({
    data: {
      role: { id: roleId },
    },
  } as never);
}

beforeEach(() => {
  mockedUseNavigate.mockReturnValue(vi.fn() as never);
  mockRole(ROLES.ENTITY_ADMIN);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Admin route', () => {
  it('renders the admin shell with two tabs for entity admins', () => {
    mockedUseMatches.mockReturnValue([
      { routeId: '/_auth/admin', pathname: '/admin' },
      { routeId: '/_auth/admin/users', pathname: '/admin/users' },
    ] as never);

    render(<RouteComponent />);

    expect(screen.getByRole('heading', { level: 1, name: 'Espace administrateur' })).toBeInTheDocument();

    expect(screen.getByRole('tab', { name: "Gestion des demandes d'habilitations" })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Gestion des utilisateurs' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.queryByRole('tab', { name: 'Gestion des entités' })).not.toBeInTheDocument();
  });

  it('renders the entites tab as active for super admins on entites routes', () => {
    mockRole(ROLES.SUPER_ADMIN);
    mockedUseMatches.mockReturnValue([
      { routeId: '/_auth/admin', pathname: '/admin' },
      { routeId: '/_auth/admin/entites', pathname: '/admin/entites' },
    ] as never);

    render(<RouteComponent />);

    expect(screen.getByRole('tab', { name: 'Gestion des entités' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: "Gestion des demandes d'habilitations" })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByRole('tab', { name: 'Gestion des utilisateurs' })).toHaveAttribute('aria-selected', 'false');
  });
});
