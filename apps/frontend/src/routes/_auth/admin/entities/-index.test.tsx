import { useNavigate, useSearch } from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEntitesListAdmin } from '@/hooks/queries/entites.hook';
import { RouteComponent } from './index';

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  Link: ({ to, params, children }: { to: string; params?: { entityId?: string }; children: React.ReactNode }) => (
    <a href={to.replace('$entityId', params?.entityId ?? '')}>{children}</a>
  ),
  useSearch: vi.fn(),
  useNavigate: vi.fn(),
}));

vi.mock('@/hooks/queries/entites.hook', () => ({
  useEntitesListAdmin: vi.fn(),
}));

const mockedUseEntitesAdmin = vi.mocked(useEntitesListAdmin);
const mockedUseSearch = vi.mocked(useSearch);
const mockedUseNavigate = vi.mocked(useNavigate);

const buildSuccessQuery = (data: {
  data: Array<{
    id: string;
    entiteNom: string;
    entiteLabel: string;
    directionNom: string;
    directionLabel: string;
    serviceNom: string;
    serviceLabel: string;
    email: string;
    contactUsager: string;
    isActiveLabel: 'Oui' | 'Non';
    editId: string;
  }>;
  meta: { total: number };
}) =>
  ({
    data,
    isPending: false,
    isError: false,
    error: null,
  }) as never;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('Admin entities index route', () => {
  it('renders the admin entities list', () => {
    mockedUseNavigate.mockReturnValue(vi.fn() as never);
    mockedUseSearch.mockReturnValue({} as never);
    mockedUseEntitesAdmin.mockReturnValue(
      buildSuccessQuery({
        data: [
          {
            id: 'root-ars',
            entiteNom: 'ARS Normandie',
            entiteLabel: 'ARS NOR',
            directionNom: '',
            directionLabel: '',
            serviceNom: '',
            serviceLabel: '',
            email: 'ars@example.fr',
            contactUsager: 'contact@ars.fr · 01 02 03 04 05',
            isActiveLabel: 'Oui',
            editId: 'root-ars',
          },
        ],
        meta: { total: 1 },
      }),
    );

    render(<RouteComponent />);

    expect(screen.getByRole('table', { name: 'Liste des entités administratives' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Nom de l’entité' })).toBeInTheDocument();
    expect(screen.getByText('ARS Normandie')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Modifier l'entité ARS Normandie" })).toHaveAttribute(
      'href',
      '/admin/entities/root-ars',
    );
  });

  it('renders an empty state when there are no admin entities', () => {
    mockedUseNavigate.mockReturnValue(vi.fn() as never);
    mockedUseSearch.mockReturnValue({} as never);
    mockedUseEntitesAdmin.mockReturnValue(
      buildSuccessQuery({
        data: [],
        meta: { total: 0 },
      }),
    );

    render(<RouteComponent />);

    expect(screen.getByText('Aucune entité administrative à afficher.')).toBeInTheDocument();
  });

  it('uses pagination search params to fetch the admin entities list', () => {
    mockedUseNavigate.mockReturnValue(vi.fn() as never);
    mockedUseSearch.mockReturnValue({ offset: 20, limit: 10 } as never);
    mockedUseEntitesAdmin.mockReturnValue(
      buildSuccessQuery({
        data: [],
        meta: { total: 0 },
      }),
    );

    render(<RouteComponent />);

    expect(mockedUseEntitesAdmin).toHaveBeenCalledWith({ offset: 20, limit: 10 });
  });

  it('renders pagination and updates search params when changing page', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    const navigate = vi.fn();
    mockedUseNavigate.mockReturnValue(navigate as never);
    mockedUseSearch.mockReturnValue({ offset: 0, limit: 10 } as never);
    mockedUseEntitesAdmin.mockReturnValue(
      buildSuccessQuery({
        data: [
          {
            id: 'root-ars',
            entiteNom: 'ARS Normandie',
            entiteLabel: 'ARS NOR',
            directionNom: '',
            directionLabel: '',
            serviceNom: '',
            serviceLabel: '',
            email: 'ars@example.fr',
            contactUsager: 'contact@ars.fr · 01 02 03 04 05',
            isActiveLabel: 'Oui',
            editId: 'root-ars',
          },
        ],
        meta: { total: 25 },
      }),
    );

    render(<RouteComponent />);

    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();

    const page2Button = screen.getByRole('button', { name: '2' });
    await userEvent.click(page2Button);

    expect(navigate).toHaveBeenCalledWith({
      search: expect.any(Function),
    });

    const searchUpdater = navigate.mock.calls[0][0].search;
    expect(searchUpdater({})).toEqual({
      offset: 10,
      limit: undefined,
    });
  });
});
