import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useUsers } from '@/hooks/queries/users.hook';
import { PendingUsersTab } from './pendingUsersTab';

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, params, children }: { to: string; params: { userId: string }; children: ReactNode }) => (
    <a href={to.replace('$userId', params.userId)}>{children}</a>
  ),
  useNavigate: vi.fn(),
  useSearch: vi.fn(),
}));

vi.mock('@/hooks/queries/users.hook', () => ({
  useUsers: vi.fn(),
}));

vi.mock('@/hooks/useUserListSSE', () => ({
  useUserListSSE: vi.fn(),
}));

const mockedUseQueryClient = vi.mocked(useQueryClient);
const mockedUseNavigate = vi.mocked(useNavigate);
const mockedUseSearch = vi.mocked(useSearch);
const mockedUseUsers = vi.mocked(useUsers);

const renderPendingUsersTab = ({
  search = {},
  navigate = vi.fn(),
}: {
  search?: { offset?: number; limit?: number; sort?: string; order?: 'asc' | 'desc' };
  navigate?: ReturnType<typeof vi.fn>;
} = {}) => {
  mockedUseQueryClient.mockReturnValue({ invalidateQueries: vi.fn() } as unknown as ReturnType<typeof useQueryClient>);
  mockedUseNavigate.mockReturnValue(navigate as unknown as ReturnType<typeof useNavigate>);
  mockedUseSearch.mockReturnValue(search as unknown as ReturnType<typeof useSearch>);
  mockedUseUsers.mockReturnValue({
    data: { data: [user], meta: { total: 1 } },
    isFetching: false,
  } as unknown as ReturnType<typeof useUsers>);

  render(<PendingUsersTab />);

  return { navigate };
};

const user = {
  id: 'user-1',
  nom: 'Dupont',
  prenom: 'Jeanne',
  createdAt: new Date('2026-01-01').toISOString(),
  entite: {
    nomComplet: 'ARS Normandie',
    label: 'ARS NOR',
    entiteMereId: null,
    entiteMere: null,
  },
};

describe('PendingUsersTab', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('updates search params to sort creation date from newest to oldest on first click', async () => {
    const { navigate } = renderPendingUsersTab({ search: { offset: 20, limit: 10 } });

    const createdAtHeader = screen.getByRole('columnheader', { name: /date de création/i });
    await userEvent.click(within(createdAtHeader).getByRole('button', { name: /trier/i }));

    expect(navigate).toHaveBeenCalledWith({ search: expect.any(Function) });
    expect(navigate.mock.calls[0][0].search({ offset: 20, limit: 10 })).toEqual({
      offset: undefined,
      limit: 10,
      sort: 'createdAt',
      order: 'desc',
    });
  });

  it('announces creation date as descending when newest to oldest sort is active', () => {
    renderPendingUsersTab({ search: { sort: 'createdAt', order: 'desc' } });

    const createdAtHeader = screen.getByRole('columnheader', { name: /date de création/i });

    expect(createdAtHeader).toHaveAttribute('aria-sort', 'descending');
    expect(within(createdAtHeader).getByRole('button', { name: /trier par date de création/i })).toBeInTheDocument();
  });

  it('ignores unsupported URL sort params for this tab', () => {
    renderPendingUsersTab({ search: { sort: 'role.label', order: 'asc' } });

    const usersQuery = mockedUseUsers.mock.calls[0][0];

    expect(usersQuery).not.toHaveProperty('sort');
    expect(usersQuery).not.toHaveProperty('order');
  });

  it('updates search params to sort affectation by entity full name on first click', async () => {
    const { navigate } = renderPendingUsersTab({ search: { offset: 20, limit: 10 } });

    const affectationHeader = screen.getByRole('columnheader', { name: /affectation/i });
    await userEvent.click(within(affectationHeader).getByRole('button', { name: /trier/i }));

    expect(navigate).toHaveBeenCalledWith({ search: expect.any(Function) });
    expect(navigate.mock.calls[0][0].search({ offset: 20, limit: 10 })).toEqual({
      offset: undefined,
      limit: 10,
      sort: 'entite.nomComplet',
      order: 'asc',
    });
  });
});
