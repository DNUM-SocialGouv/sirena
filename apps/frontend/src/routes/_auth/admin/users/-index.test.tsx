import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RouteComponent } from './index';

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
}));

vi.mock('@/components/common/tables/pendingUsersTab', () => ({
  PendingUsersTab: () => <div>Gestion des demandes d'habilitations</div>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Admin users index route', () => {
  it('renders the pending users tab content', () => {
    render(<RouteComponent />);

    expect(screen.getByText("Gestion des demandes d'habilitations")).toBeInTheDocument();
  });
});
