import { useNavigate, useSearch } from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEntitesListAdmin, useRootEntitesListAdmin } from '@/hooks/queries/entites.hook';
import { RouteComponent } from './index';

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  Link: ({ to, params, children }: { to: string; params?: { entiteId?: string }; children: React.ReactNode }) => (
    <a href={to.replace('$entiteId', params?.entiteId ?? '')}>{children}</a>
  ),
  useSearch: vi.fn(),
  useNavigate: vi.fn(),
}));

vi.mock('@/hooks/queries/entites.hook', () => ({
  useEntitesListAdmin: vi.fn(),
  useRootEntitesListAdmin: vi.fn(),
}));

const mockedUseEntitesAdmin = vi.mocked(useEntitesListAdmin);
const mockedUseRootEntitesAdmin = vi.mocked(useRootEntitesListAdmin);
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

const buildRootEntitesQuery = (data: Array<{ id: string; nomComplet: string; label: string }> = []) =>
  ({
    data: { data },
    isPending: false,
    isError: false,
    error: null,
  }) as never;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('Admin entites index route', () => {
  beforeEach(() => {
    mockedUseRootEntitesAdmin.mockReturnValue(buildRootEntitesQuery());
  });

  it('fetches root entites for the admin filter options', () => {
    mockedUseNavigate.mockReturnValue(vi.fn() as never);
    mockedUseSearch.mockReturnValue({} as never);
    mockedUseEntitesAdmin.mockReturnValue(
      buildSuccessQuery({
        data: [],
        meta: { total: 0 },
      }),
    );

    render(<RouteComponent />);

    expect(mockedUseRootEntitesAdmin).toHaveBeenCalledWith();
  });

  it('renders the admin entites list', () => {
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
      '/admin/entites/root-ars',
    );
  });

  it('renders an empty state when there are no admin entites', () => {
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

  it('updates rootEntiteIds search param and resets offset when selecting a root entite filter', async () => {
    const navigate = vi.fn();
    mockedUseNavigate.mockReturnValue(navigate);
    mockedUseSearch.mockReturnValue({ offset: 20 });
    mockedUseRootEntitesAdmin.mockReturnValue(
      buildRootEntitesQuery([{ id: 'root-ars', nomComplet: 'ARS Normandie', label: 'ARS NOR' }]),
    );
    mockedUseEntitesAdmin.mockReturnValue(
      buildSuccessQuery({
        data: [],
        meta: { total: 0 },
      }),
    );

    render(<RouteComponent />);

    await userEvent.click(screen.getByRole('button', { name: 'Entité administrative' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'ARS Normandie' }));

    expect(navigate).toHaveBeenCalledWith({
      search: expect.any(Function),
    });

    const searchUpdater = navigate.mock.calls[0][0].search;
    expect(searchUpdater({ offset: 20 })).toEqual({
      offset: undefined,
      rootEntiteIds: 'root-ars',
    });
  });

  it('removes rootEntiteIds search param when unchecking the last selected root entite', async () => {
    const navigate = vi.fn();
    mockedUseNavigate.mockReturnValue(navigate);
    mockedUseSearch.mockReturnValue({ offset: 20, rootEntiteIds: 'root-ars' });
    mockedUseRootEntitesAdmin.mockReturnValue(
      buildRootEntitesQuery([{ id: 'root-ars', nomComplet: 'ARS Normandie', label: 'ARS NOR' }]),
    );
    mockedUseEntitesAdmin.mockReturnValue(
      buildSuccessQuery({
        data: [],
        meta: { total: 0 },
      }),
    );

    render(<RouteComponent />);

    expect(
      screen.getByRole('button', { name: /Entité administrative\s*\(1\)\s*entité administrative sélectionnée/ }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /Entité administrative\s*\(1\)\s*entité administrative sélectionnée/ }),
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'ARS Normandie' }));

    expect(navigate).toHaveBeenCalledWith({
      search: expect.any(Function),
    });

    const searchUpdater = navigate.mock.calls[0][0].search;
    expect(searchUpdater({ offset: 20, rootEntiteIds: 'root-ars' })).toEqual({
      offset: undefined,
      rootEntiteIds: undefined,
    });
  });

  it('appends a selected root entite to existing rootEntiteIds search param', async () => {
    const navigate = vi.fn();
    mockedUseNavigate.mockReturnValue(navigate);
    mockedUseSearch.mockReturnValue({ rootEntiteIds: 'root-ars' });
    mockedUseRootEntitesAdmin.mockReturnValue(
      buildRootEntitesQuery([
        { id: 'root-ars', nomComplet: 'ARS Normandie', label: 'ARS NOR' },
        { id: 'root-cd', nomComplet: 'CD Calvados', label: 'CD 14' },
      ]),
    );
    mockedUseEntitesAdmin.mockReturnValue(
      buildSuccessQuery({
        data: [],
        meta: { total: 0 },
      }),
    );

    render(<RouteComponent />);

    await userEvent.click(
      screen.getByRole('button', { name: /Entité administrative\s*\(1\)\s*entité administrative sélectionnée/ }),
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'CD Calvados' }));

    const searchUpdater = navigate.mock.calls[0][0].search;
    expect(searchUpdater({ rootEntiteIds: 'root-ars' })).toEqual({
      rootEntiteIds: 'root-ars,root-cd',
      offset: undefined,
    });
  });

  it('renders search and submits trimmed search while preserving filters and resetting offset', async () => {
    const navigate = vi.fn();
    mockedUseNavigate.mockReturnValue(navigate);
    mockedUseSearch.mockReturnValue({ offset: 20, rootEntiteIds: 'root-ars', search: 'ars' });
    mockedUseEntitesAdmin.mockReturnValue(
      buildSuccessQuery({
        data: [],
        meta: { total: 0 },
      }),
    );

    render(<RouteComponent />);

    expect(screen.getAllByText('Rechercher une entité administrative par nom ou libellé')).not.toHaveLength(0);
    expect(mockedUseEntitesAdmin).toHaveBeenCalledWith({
      offset: 20,
      limit: 10,
      rootEntiteIds: 'root-ars',
      search: 'ars',
    });

    const searchInput = screen.getByRole('searchbox', {
      name: 'Rechercher une entité administrative par nom ou libellé',
    });
    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, '  médiation  ');
    await userEvent.click(screen.getByRole('button', { name: 'Rechercher' }));

    const searchUpdater = navigate.mock.calls[0][0].search;
    expect(searchUpdater({ offset: 20, rootEntiteIds: 'root-ars', search: 'ars' })).toEqual({
      offset: undefined,
      rootEntiteIds: 'root-ars',
      search: 'médiation',
    });
  });

  it('updates the page title with the active search result count', () => {
    mockedUseNavigate.mockReturnValue(vi.fn() as never);
    mockedUseSearch.mockReturnValue({ search: 'test' });
    mockedUseEntitesAdmin.mockReturnValue(
      buildSuccessQuery({
        data: [],
        meta: { total: 2 },
      }),
    );

    render(<RouteComponent />);

    expect(document.title).toBe('2 résultats pour : "test" - Gestion des entités - Espace administrateur - SIRENA');
  });

  it('shows active search result count and clears search while preserving filters and resetting offset', async () => {
    const navigate = vi.fn();
    mockedUseNavigate.mockReturnValue(navigate as never);
    mockedUseSearch.mockReturnValue({ offset: 20, rootEntiteIds: 'root-ars', search: 'test' });
    mockedUseEntitesAdmin.mockReturnValue(
      buildSuccessQuery({
        data: [],
        meta: { total: 102 },
      }),
    );

    render(<RouteComponent />);

    expect(screen.getByText(/102/)).toBeInTheDocument();
    expect(screen.getByText(/résultats pour "test"/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Effacer la recherche' }));

    const searchUpdater = navigate.mock.calls[0][0].search;
    expect(searchUpdater({ offset: 20, rootEntiteIds: 'root-ars', search: 'test' })).toEqual({
      offset: undefined,
      rootEntiteIds: 'root-ars',
      search: undefined,
    });
  });

  it('uses rootEntiteIds search param to fetch the filtered admin entites list', () => {
    mockedUseNavigate.mockReturnValue(vi.fn());
    mockedUseSearch.mockReturnValue({ rootEntiteIds: 'root-ars,root-dd' });
    mockedUseEntitesAdmin.mockReturnValue(
      buildSuccessQuery({
        data: [],
        meta: { total: 0 },
      }),
    );

    render(<RouteComponent />);

    expect(mockedUseEntitesAdmin).toHaveBeenCalledWith({
      offset: 0,
      limit: 10,
      rootEntiteIds: 'root-ars,root-dd',
    });
  });

  it('uses pagination search params to fetch the admin entites list', () => {
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
