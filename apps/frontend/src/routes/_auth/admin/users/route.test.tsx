import { useMatchRoute, useNavigate } from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteComponent } from './route';

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  useMatchRoute: vi.fn(),
  useNavigate: vi.fn(),
}));

vi.mock('@sirena/ui', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div data-testid="tabs">{children}</div>,
}));

vi.mock('@/components/common/tables/pendingUsersTab', () => ({
  PendingUsersTab: () => <div>Pending users</div>,
}));

vi.mock('@/components/common/tables/allUsersTab', () => ({
  AllUsersTab: () => <div>All users</div>,
}));

const mockedUseMatchRoute = vi.mocked(useMatchRoute);
const mockedUseNavigate = vi.mocked(useNavigate);

beforeEach(() => {
  mockedUseNavigate.mockReturnValue(vi.fn() as never);
  mockedUseMatchRoute.mockReturnValue(vi.fn(() => false) as never);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Admin users route', () => {
  it('renders "Espace administrateur" as the page title', () => {
    render(<RouteComponent />);

    expect(screen.getByRole('heading', { level: 1, name: 'Espace administrateur' })).toBeInTheDocument();
  });
});
