import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RouteComponent } from './index';

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  Navigate: ({ to }: { to: string }) => <div>redirect:{to}</div>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Admin index route', () => {
  it('redirects to /admin/users', () => {
    render(<RouteComponent />);

    expect(screen.getByText('redirect:/admin/users')).toBeInTheDocument();
  });
});
