import { ROLES } from '@sirena/common/constants';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { Route, RouteComponent } from './directions.create';

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => options,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock('@/lib/auth-guards', () => ({
  requireAuthAndRoles: vi.fn(() => 'mocked-entity-admin-guard'),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.title = '';
});

describe('Admin local Direction create route', () => {
  it('restricts the route to entity admins', () => {
    expect(vi.mocked(requireAuthAndRoles)).toHaveBeenCalledWith([ROLES.ENTITY_ADMIN]);
    expect((Route as unknown as { beforeLoad: unknown }).beforeLoad).toBe('mocked-entity-admin-guard');
  });

  it('renders the Direction-specific creation title and local return link', () => {
    render(<RouteComponent />);

    expect(screen.getByRole('heading', { level: 2, name: 'Créer une direction' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Directions et services/ })).toHaveAttribute(
      'href',
      '/admin/directions-services',
    );
    expect(document.title).toBe('Créer une direction - Directions et services - SIRENA');
  });
});
