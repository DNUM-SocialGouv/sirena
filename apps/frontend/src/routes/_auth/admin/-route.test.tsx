import { ROLES } from '@sirena/common/constants';
import { useMatches, useNavigate } from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useResolvedFeatureFlags } from '@/hooks/queries/featureFlags.hook';
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

vi.mock('@/hooks/queries/featureFlags.hook', () => ({
  useResolvedFeatureFlags: vi.fn(),
}));

const mockedUseMatches = vi.mocked(useMatches);
const mockedUseNavigate = vi.mocked(useNavigate);
const mockedUseProfile = vi.mocked(useProfile);
const mockedUseResolvedFeatureFlags = vi.mocked(useResolvedFeatureFlags);

function mockRole(roleId: string, affectationChain: Array<{ id: string; nomComplet: string }> = []) {
  mockedUseProfile.mockReturnValue({
    data: {
      role: { id: roleId },
      affectationChain,
    },
  } as never);
}

beforeEach(() => {
  mockedUseNavigate.mockReturnValue(vi.fn() as never);
  mockedUseResolvedFeatureFlags.mockReturnValue({
    isPending: false,
    data: {
      ADMIN_LOCAL_DIRECTIONS_SERVICES: true,
      SIREC_MIGRATION: false,
    },
  } as never);
  mockRole(ROLES.ENTITY_ADMIN);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Admin route', () => {
  it('renders nothing while resolved feature flags are pending', () => {
    mockedUseResolvedFeatureFlags.mockReturnValue({ isPending: true, data: undefined } as never);
    mockedUseMatches.mockReturnValue([
      { routeId: '/_auth/admin', pathname: '/admin' },
      { routeId: '/_auth/admin/users', pathname: '/admin/users' },
    ] as never);

    render(<RouteComponent />);

    expect(screen.queryByRole('heading', { level: 1, name: 'Espace administrateur' })).not.toBeInTheDocument();
  });

  it('renders the admin shell with directions and services instead of global entites for entity admins', () => {
    mockedUseMatches.mockReturnValue([
      { routeId: '/_auth/admin', pathname: '/admin' },
      { routeId: '/_auth/admin/users', pathname: '/admin/users' },
    ] as never);

    render(<RouteComponent />);

    expect(screen.getByRole('heading', { level: 1, name: 'Espace administrateur' })).toBeInTheDocument();

    expect(screen.getByRole('tab', { name: "Demandes d'habilitation" })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Utilisateurs' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Directions et services' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.queryByRole('tab', { name: 'Entités' })).not.toBeInTheDocument();
  });

  it.each([
    [
      'Direction',
      [
        { id: 'root-ars', nomComplet: 'ARS Normandie' },
        { id: 'dir-autonomie', nomComplet: 'Direction Autonomie' },
      ],
    ],
    [
      'Service',
      [
        { id: 'root-ars', nomComplet: 'ARS Normandie' },
        { id: 'dir-autonomie', nomComplet: 'Direction Autonomie' },
        { id: 'service-pa', nomComplet: 'Service PA' },
      ],
    ],
  ])('does not render local Entités for a %s-level entity admin', (_level, affectationChain) => {
    mockRole(ROLES.ENTITY_ADMIN, affectationChain);
    mockedUseMatches.mockReturnValue([
      { routeId: '/_auth/admin', pathname: '/admin' },
      { routeId: '/_auth/admin/users', pathname: '/admin/users' },
    ] as never);

    render(<RouteComponent />);

    expect(screen.queryByRole('tab', { name: 'Entités' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Directions et services' })).toBeInTheDocument();
  });

  it('renders Entités and Directions et services for root-level entity admins', () => {
    mockRole(ROLES.ENTITY_ADMIN, [{ id: 'root-ars', nomComplet: 'ARS Normandie' }]);
    mockedUseMatches.mockReturnValue([
      { routeId: '/_auth/admin', pathname: '/admin' },
      { routeId: '/_auth/admin/entite', pathname: '/admin/entite' },
    ] as never);

    render(<RouteComponent />);

    expect(screen.getByRole('tab', { name: 'Entités' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Directions et services' })).toHaveAttribute('aria-selected', 'false');
  });

  it('renders the directions and services tab as active for entity admins on directions-services routes', () => {
    mockedUseMatches.mockReturnValue([
      { routeId: '/_auth/admin', pathname: '/admin' },
      { routeId: '/_auth/admin/directions-services/', pathname: '/admin/directions-services/' },
    ] as never);

    render(<RouteComponent />);

    expect(screen.getByRole('tab', { name: 'Directions et services' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: "Demandes d'habilitation" })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Utilisateurs' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.queryByRole('tab', { name: 'Entités' })).not.toBeInTheDocument();
  });

  it('renders the entites tab as active for super admins on entites routes', () => {
    mockRole(ROLES.SUPER_ADMIN);
    mockedUseMatches.mockReturnValue([
      { routeId: '/_auth/admin', pathname: '/admin' },
      { routeId: '/_auth/admin/entites', pathname: '/admin/entites' },
    ] as never);

    render(<RouteComponent />);

    expect(screen.getByRole('tab', { name: 'Entités' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: "Demandes d'habilitation" })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Utilisateurs' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.queryByRole('tab', { name: 'Directions et services' })).not.toBeInTheDocument();
  });
});
