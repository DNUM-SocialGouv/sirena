import { QueryClient, QueryClientProvider, type UseQueryResult } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PendingUsersTab } from './PendingUsersTab';

vi.mock('@/hooks/queries/useRoles', () => ({
  useRoles: vi.fn(),
}));

vi.mock('@/hooks/queries/useUser', () => ({
  useUser: vi.fn(),
}));

vi.mock('@/components/loader.tsx', () => ({
  Loader: () => <div data-testid="loader">Chargement...</div>,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
  }: { to: string; params?: Record<string, string | number>; children: React.ReactNode }) => {
    let href = to;
    if (params) {
      for (const key of Object.keys(params)) {
        href = href.replace(`$${key}`, String(params[key]));
      }
    }
    return <a href={href}>{children}</a>;
  },
}));

import { useRoles } from '@/hooks/queries/useRoles';
import { useUser } from '@/hooks/queries/useUser';

const mockUseRoles = vi.mocked(useRoles);
const mockUseUser = vi.mocked(useUser);

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
};

const mockRolesData = {
  data: [
    { id: '1', roleName: 'ADMIN' },
    { id: '2', roleName: 'PENDING' },
    { id: '3', roleName: 'USER' },
  ],
};

const mockUsersData = {
  data: [
    {
      id: '1',
      firstName: 'Jean',
      lastName: 'Dupont',
      createdAt: '2024-01-15T10:30:00Z',
    },
    {
      id: '2',
      firstName: 'Marie',
      lastName: 'Martin',
      createdAt: '2024-01-16T14:45:00Z',
    },
  ],
};

describe('PendingUsersTab Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('State of loading', () => {
    it('display the loader during role loading', () => {
      mockUseRoles.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as unknown as UseQueryResult<{ data: { id: string; roleName: string; description: string }[] }, Error>);

      mockUseUser.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as unknown as UseQueryResult<
        {
          data: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            uid: string;
            sub: string;
            createdAt: string;
            active: boolean;
            roleId: string | null;
          }[];
        },
        Error
      >);

      renderWithProviders(<PendingUsersTab />);

      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });

    it('display loader during users loading', () => {
      mockUseRoles.mockReturnValue({
        data: mockRolesData,
        isLoading: false,
        error: null,
      } as unknown as UseQueryResult<{ data: { id: string; roleName: string; description: string }[] }, Error>);

      mockUseUser.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as unknown as UseQueryResult<
        {
          data: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            uid: string;
            sub: string;
            createdAt: string;
            active: boolean;
            roleId: string | null;
          }[];
        },
        Error
      >);

      renderWithProviders(<PendingUsersTab />);

      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });
  });

  describe('Errors display', () => {
    it('display an error message when role loading fails', () => {
      mockUseRoles.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Erreur de réseau'),
      } as unknown as UseQueryResult<{ data: { id: string; roleName: string; description: string }[] }, Error>);

      mockUseUser.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as unknown as UseQueryResult<
        {
          data: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            uid: string;
            sub: string;
            createdAt: string;
            active: boolean;
            roleId: string | null;
          }[];
        },
        Error
      >);

      renderWithProviders(<PendingUsersTab />);

      expect(screen.getByText('Erreur lors du chargement des utilisateurs en attente')).toBeInTheDocument();
    });

    it('display an error message when users loading fails', () => {
      mockUseRoles.mockReturnValue({
        data: mockRolesData,
        isLoading: false,
        error: null,
      } as unknown as UseQueryResult<{ data: { id: string; roleName: string; description: string }[] }, Error>);

      mockUseUser.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Erreur de réseau'),
      } as UseQueryResult<
        {
          data: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            uid: string;
            sub: string;
            createdAt: string;
            active: boolean;
            roleId: string | null;
          }[];
        },
        Error
      >);

      renderWithProviders(<PendingUsersTab />);

      expect(screen.getByText('Erreur lors du chargement des utilisateurs en attente')).toBeInTheDocument();
    });
  });

  describe('Empty states', () => {
    it('Display a message when no data are available', () => {
      mockUseRoles.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      } as unknown as UseQueryResult<{ data: { id: string; roleName: string; description: string }[] }, Error>);

      mockUseUser.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as UseQueryResult<
        {
          data: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            uid: string;
            sub: string;
            createdAt: string;
            active: boolean;
            roleId: string | null;
          }[];
        },
        Error
      >);

      renderWithProviders(<PendingUsersTab />);

      expect(screen.getByText('Aucune donnée disponible')).toBeInTheDocument();
    });
  });

  describe('business logic', () => {
    it('does not trigger the users request when PENDING role does not exist (should never happen)', () => {
      const rolesDataWithoutPending = {
        data: [
          { id: '1', roleName: 'ADMIN' },
          { id: '3', roleName: 'USER' },
        ],
      };

      mockUseRoles.mockReturnValue({
        data: rolesDataWithoutPending,
        isLoading: false,
        error: null,
      } as unknown as UseQueryResult<{ data: { id: string; roleName: string; description: string }[] }, Error>);

      const mockUseUserCall = vi.fn().mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as UseQueryResult<
        {
          data: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            uid: string;
            sub: string;
            createdAt: string;
            active: boolean;
            roleId: string | null;
          }[];
        },
        Error
      >);

      mockUseUser.mockImplementation(mockUseUserCall);

      renderWithProviders(<PendingUsersTab />);

      expect(mockUseUserCall).toHaveBeenCalledWith(undefined, false);
    });

    it('call useUser with the roleId of PENDING role', () => {
      mockUseRoles.mockReturnValue({
        data: mockRolesData,
        isLoading: false,
        error: null,
      } as unknown as UseQueryResult<{ data: { id: string; roleName: string; description: string }[] }, Error>);

      const mockUseUserCall = vi.fn().mockReturnValue({
        data: mockUsersData,
        isLoading: false,
        error: null,
      } as UseQueryResult<
        {
          data: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            uid: string;
            sub: string;
            createdAt: string;
            active: boolean;
            roleId: string | null;
          }[];
        },
        Error
      >);

      mockUseUser.mockImplementation(mockUseUserCall);

      renderWithProviders(<PendingUsersTab />);

      expect(mockUseUserCall).toHaveBeenCalledWith({ roleId: '2' }, true);
    });
  });

  describe('display the table', () => {
    beforeEach(() => {
      mockUseRoles.mockReturnValue({
        data: mockRolesData,
        isLoading: false,
        error: null,
      } as unknown as UseQueryResult<{ data: { id: string; roleName: string; description: string }[] }, Error>);

      mockUseUser.mockReturnValue({
        data: mockUsersData,
        isLoading: false,
        error: null,
      } as UseQueryResult<
        {
          data: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            uid: string;
            sub: string;
            createdAt: string;
            active: boolean;
            roleId: string | null;
          }[];
        },
        Error
      >);
    });

    it('display the title of the table', () => {
      renderWithProviders(<PendingUsersTab />);

      expect(screen.getByText('Liste des utilisateurs en attente de validation')).toBeInTheDocument();
    });

    it('display table with the right column', () => {
      renderWithProviders(<PendingUsersTab />);

      expect(screen.getByText('Nom')).toBeInTheDocument();
      expect(screen.getByText('Prénom')).toBeInTheDocument();
      expect(screen.getByText('Date de création')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('Display the users data', () => {
      renderWithProviders(<PendingUsersTab />);

      expect(screen.getByText('Dupont')).toBeInTheDocument();
      expect(screen.getByText('Jean')).toBeInTheDocument();

      expect(screen.getByText('Martin')).toBeInTheDocument();
      expect(screen.getByText('Marie')).toBeInTheDocument();
    });

    it('display the link "Traiter la demande" for each user', () => {
      renderWithProviders(<PendingUsersTab />);

      const actionLinks = screen.getAllByText('Traiter la demande');
      expect(actionLinks).toHaveLength(2);

      expect(actionLinks[0]).toHaveAttribute('href', '/user/1');
      expect(actionLinks[1]).toHaveAttribute('href', '/user/2');
    });

    it('when no users are at the PENDING state', () => {
      const emptyUsersData = {
        data: [],
      };

      mockUseUser.mockReturnValue({
        data: emptyUsersData,
        isLoading: false,
        error: null,
      } as unknown as UseQueryResult<
        {
          data: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            uid: string;
            sub: string;
            createdAt: string;
            active: boolean;
            roleId: string | null;
          }[];
        },
        Error
      >);

      renderWithProviders(<PendingUsersTab />);

      expect(screen.getByText('Liste des utilisateurs en attente de validation')).toBeInTheDocument();
      expect(screen.getByText('Nom')).toBeInTheDocument();
    });
  });
});
