import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RouteComponent } from './all';

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
}));

vi.mock('@/components/common/tables/allUsersTab', () => ({
  AllUsersTab: () => <div>All users tab</div>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Admin users all route', () => {
  it('renders the all users tab content', () => {
    render(<RouteComponent />);

    expect(screen.getByText('All users tab')).toBeInTheDocument();
  });
});
