import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RouteComponent } from './route';

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  Outlet: () => <div>Users outlet</div>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Admin users parent route', () => {
  it('renders its child routes through an outlet', () => {
    render(<RouteComponent />);

    expect(screen.getByText('Users outlet')).toBeInTheDocument();
  });
});
