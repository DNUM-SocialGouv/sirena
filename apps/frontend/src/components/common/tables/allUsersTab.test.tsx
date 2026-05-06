import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useUsers } from '@/hooks/queries/users.hook';
import { AllUsersTab } from './allUsersTab';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, params, children }: { to: string; params: { userId: string }; children: ReactNode }) => (
    <a href={to.replace('$userId', params.userId)}>{children}</a>
  ),
  useNavigate: vi.fn(),
  useSearch: vi.fn(),
}));

vi.mock('@/hooks/queries/profile.hook', () => ({
  profileQueryOptions: vi.fn(() => ({ queryKey: ['profile'], queryFn: vi.fn() })),
}));

vi.mock('@/hooks/queries/users.hook', () => ({
  useUsers: vi.fn(),
}));

vi.mock('@/hooks/useUserListSSE', () => ({
  useUserListSSE: vi.fn(),
}));

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseQueryClient = vi.mocked(useQueryClient);
const mockedUseNavigate = vi.mocked(useNavigate);
const mockedUseSearch = vi.mocked(useSearch);
const mockedUseUsers = vi.mocked(useUsers);

const renderAllUsersTab = ({
  search = {},
  navigate = vi.fn(),
}: {
  search?: { offset?: number; limit?: number; sort?: string; order?: 'asc' | 'desc' };
  navigate?: ReturnType<typeof vi.fn>;
} = {}) => {
  mockedUseQueryClient.mockReturnValue({ invalidateQueries: vi.fn() } as unknown as ReturnType<typeof useQueryClient>);
  mockedUseQuery.mockReturnValue({ data: { role: { id: 'SUPER_ADMIN' } } } as unknown as ReturnType<typeof useQuery>);
  mockedUseNavigate.mockReturnValue(navigate as unknown as ReturnType<typeof useNavigate>);
  mockedUseSearch.mockReturnValue(search as unknown as ReturnType<typeof useSearch>);
  mockedUseUsers.mockReturnValue({
    data: { data: [user], meta: { total: 1 } },
    isFetching: false,
  } as unknown as ReturnType<typeof useUsers>);

  render(<AllUsersTab />);

  return { navigate };
};

const user = {
  id: 'user-1',
  nom: 'Dupont',
  prenom: 'Jeanne',
  role: { id: 'READER', label: 'Agent en lecture' },
  roleId: 'READER',
  statutId: 'ACTIF',
  entite: {
    nomComplet: 'ARS Normandie',
    label: 'ARS NOR',
    entiteMereId: null,
    entiteMere: null,
  },
};

describe('AllUsersTab', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('ignores unsupported URL sort params for this tab', () => {
    renderAllUsersTab({ search: { sort: 'createdAt', order: 'desc' } });

    const usersQuery = mockedUseUsers.mock.calls[0][0];

    expect(usersQuery).not.toHaveProperty('sort');
    expect(usersQuery).not.toHaveProperty('order');
  });

  it.each([
    { header: /rôle/i, sort: 'role.label', order: 'asc' },
    { header: /statut/i, sort: 'statutId', order: 'asc' },
    { header: /affectation/i, sort: 'entite.nomComplet', order: 'asc' },
  ])('updates search params to sort $sort on first click', async ({ header, sort, order }) => {
    const { navigate } = renderAllUsersTab({ search: { offset: 20, limit: 10 } });

    const columnHeader = screen.getByRole('columnheader', { name: header });
    await userEvent.click(within(columnHeader).getByRole('button', { name: /trier/i }));

    expect(navigate).toHaveBeenCalledWith({ search: expect.any(Function) });
    expect(navigate.mock.calls[0][0].search({ offset: 20, limit: 10 })).toEqual({
      offset: undefined,
      limit: 10,
      sort,
      order,
    });
  });
});
