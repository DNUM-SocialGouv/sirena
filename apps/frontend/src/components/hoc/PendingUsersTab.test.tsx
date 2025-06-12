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

describe('PendingUsersTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('États de chargement', () => {
    it('affiche le loader pendant le chargement des rôles', () => {
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

    it('affiche le loader pendant le chargement des utilisateurs', () => {
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

  describe('Gestion des erreurs', () => {
    it("affiche un message d'erreur en cas d'erreur lors du chargement des rôles", () => {
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

    it("affiche un message d'erreur en cas d'erreur lors du chargement des utilisateurs", () => {
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

  describe('États vides', () => {
    it("affiche un message quand aucune donnée n'est disponible", () => {
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

  describe('Logique métier', () => {
    it("ne déclenche pas la requête utilisateurs si le rôle PENDING n'existe pas", () => {
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

    it('appelle useUser avec le bon roleId du rôle PENDING', () => {
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

  describe('Affichage de la table', () => {
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

    it('affiche correctement le titre de la table', () => {
      renderWithProviders(<PendingUsersTab />);

      expect(screen.getByText('Liste des utilisateurs en attente de validation')).toBeInTheDocument();
    });

    it('affiche correctement les en-têtes de colonnes', () => {
      renderWithProviders(<PendingUsersTab />);

      expect(screen.getByText('Nom')).toBeInTheDocument();
      expect(screen.getByText('Prénom')).toBeInTheDocument();
      expect(screen.getByText('Date de création')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('affiche correctement les données des utilisateurs', () => {
      renderWithProviders(<PendingUsersTab />);

      expect(screen.getByText('Dupont')).toBeInTheDocument();
      expect(screen.getByText('Jean')).toBeInTheDocument();

      expect(screen.getByText('Martin')).toBeInTheDocument();
      expect(screen.getByText('Marie')).toBeInTheDocument();
    });

    it('formate correctement les dates en français', () => {
      renderWithProviders(<PendingUsersTab />);

      expect(screen.getByText('15/01/2024')).toBeInTheDocument();
      expect(screen.getByText('16/01/2024')).toBeInTheDocument();
    });

    it('affiche les liens Traiter la demande pour chaque utilisateur', () => {
      renderWithProviders(<PendingUsersTab />);

      const actionLinks = screen.getAllByText('Traiter la demande');
      expect(actionLinks).toHaveLength(2);

      expect(actionLinks[0]).toHaveAttribute('href', '/user/1');
      expect(actionLinks[1]).toHaveAttribute('href', '/user/2');
    });

    it("gère le cas où la liste d'utilisateurs est vide", () => {
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
