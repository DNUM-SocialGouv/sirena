import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useUsers } from '@/hooks/queries/users.hook';
import { PendingUsersTab } from './pendingUsersTab';

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: vi.fn(({ to, params, children }) => <a href={to.replace('$userId', params.userId)}>{children}</a>),
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

const mockQueryClient = () => {
  mockedUseQueryClient.mockReturnValue({ invalidateQueries: vi.fn() } as unknown as ReturnType<typeof useQueryClient>);
};

const mockNavigate = (navigate: ReturnType<typeof vi.fn>) => {
  mockedUseNavigate.mockReturnValue(navigate as unknown as ReturnType<typeof useNavigate>);
};

const mockSearch = (search: { offset?: number; limit?: number; sort?: string; order?: 'asc' | 'desc' }) => {
  mockedUseSearch.mockReturnValue(search as unknown as ReturnType<typeof useSearch>);
};

const mockUsersQuery = () => {
  mockedUseUsers.mockReturnValue({
    data: { data: [user], meta: { total: 1 } },
    isFetching: false,
  } as unknown as ReturnType<typeof useUsers>);
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
    const navigate = vi.fn();
    mockQueryClient();
    mockNavigate(navigate);
    mockSearch({ offset: 20, limit: 10 });
    mockUsersQuery();

    render(<PendingUsersTab />);

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
    mockQueryClient();
    mockNavigate(vi.fn());
    mockSearch({ sort: 'createdAt', order: 'desc' });
    mockUsersQuery();

    render(<PendingUsersTab />);

    const createdAtHeader = screen.getByRole('columnheader', { name: /date de création/i });

    expect(createdAtHeader).toHaveAttribute('aria-sort', 'descending');
    expect(within(createdAtHeader).getByRole('button', { name: /tri décroissant/i })).toBeInTheDocument();
  });

  it('updates search params to sort affectation by entity full name on first click', async () => {
    const navigate = vi.fn();
    mockQueryClient();
    mockNavigate(navigate);
    mockSearch({ offset: 20, limit: 10 });
    mockUsersQuery();

    render(<PendingUsersTab />);

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
