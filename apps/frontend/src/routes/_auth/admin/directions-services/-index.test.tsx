import { ROLES } from '@sirena/common/constants';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDirectionsServicesList } from '@/hooks/queries/entites.hook';
import { useProfile } from '@/hooks/queries/profile.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { requireAdminLocalAccess } from '../-admin-local-route-guard';
import { Route, RouteComponent } from './index';

const { authGuardSpy } = vi.hoisted(() => ({
  authGuardSpy: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => options,
  Link: ({
    children,
    className,
    params,
    to,
  }: {
    children: React.ReactNode;
    className?: string;
    params?: { entiteId?: string };
    to: string;
  }) => (
    <a className={className} href={to.replace('$entiteId', params?.entiteId ?? '')}>
      {children}
    </a>
  ),
}));

vi.mock('@/hooks/queries/profile.hook', () => ({
  useProfile: vi.fn(),
}));

vi.mock('@/hooks/queries/entites.hook', () => ({
  useDirectionsServicesList: vi.fn(),
}));

vi.mock('@/lib/api/fetchFeatureFlags', () => ({
  fetchResolvedFeatureFlags: vi.fn(),
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: {
    ensureQueryData: vi.fn(),
  },
}));

vi.mock('@/lib/auth-guards', () => ({
  requireAuthAndRoles: vi.fn(() => authGuardSpy),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.title = '';
});

describe('Admin directions and services route', () => {
  it('uses the shared Admin-local access guard', () => {
    expect(vi.mocked(requireAuthAndRoles)).toHaveBeenCalledWith([ROLES.ENTITY_ADMIN]);
    expect((Route as unknown as { beforeLoad: unknown }).beforeLoad).toBe(requireAdminLocalAccess);
  });

  it('renders an accessible page title with the admin local affectation organization', () => {
    vi.mocked(useProfile).mockReturnValue({
      data: {
        affectationChain: [{ id: 'root-ars', nomComplet: 'ARS Normandie' }],
      },
    } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({ data: { data: [] } } as never);

    render(<RouteComponent />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Directions et services (ARS Normandie)' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      /direction” désigne le premier niveau de votre organisation et “service” désigne le second niveau/,
    );
    expect(document.title).toBe('Directions et services (ARS Normandie) - Espace administrateur - SIRENA');
  });

  it('keeps root-level descendant management without offering root editing', () => {
    vi.mocked(useProfile).mockReturnValue({
      data: {
        affectationChain: [{ id: 'root-ars', nomComplet: 'ARS Normandie' }],
      },
    } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        data: [
          {
            id: 'dir-autonomie',
            directionNom: 'Direction Autonomie',
            directionLabel: 'DA',
            serviceNom: '',
            serviceLabel: '',
            email: 'direction-autonomie@ars.fr',
            editId: 'dir-autonomie',
            canEdit: true,
          },
        ],
        capabilities: { canCreateDirection: true, canCreateService: true },
      },
    } as never);

    render(<RouteComponent />);

    expect(screen.queryByRole('link', { name: 'Modifier mon entité' })).not.toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'ARS Normandie' })).not.toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Direction Autonomie' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ajouter une direction' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ajouter un service' })).toBeInTheDocument();
  });

  it('shows an assigned Service as editable with its parent Direction and no creation controls', () => {
    vi.mocked(useProfile).mockReturnValue({
      data: {
        affectationChain: [
          { id: 'root-ars', nomComplet: 'ARS Normandie' },
          { id: 'dir-autonomie', nomComplet: 'Direction Autonomie' },
          { id: 'service-pa', nomComplet: 'Service PA' },
        ],
      },
    } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        data: [
          {
            id: 'service-pa',
            directionNom: 'Direction Autonomie',
            directionLabel: 'DA',
            serviceNom: 'Service PA',
            serviceLabel: 'PA',
            email: 'service-pa@ars.fr',
            editId: 'service-pa',
            canEdit: true,
          },
        ],
        capabilities: { canCreateDirection: false, canCreateService: false },
      },
    } as never);

    render(<RouteComponent />);

    expect(screen.getByRole('cell', { name: 'Direction Autonomie' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Service PA' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'Modifier le service Service PA de la direction Direction Autonomie',
      }),
    ).toHaveAttribute('href', '/admin/directions-services/service-pa/edit');
    expect(screen.queryByRole('link', { name: 'Modifier mon entité' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ajouter une direction' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ajouter un service' })).not.toBeInTheDocument();
  });

  it('hides add service when backend capabilities disallow it for a Direction-level affectation', () => {
    vi.mocked(useProfile).mockReturnValue({
      data: {
        affectationChain: [
          { id: 'root-ars', nomComplet: 'ARS Normandie' },
          { id: 'dir-autonomie', nomComplet: 'Direction Autonomie' },
        ],
      },
    } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        data: [],
        capabilities: {
          canCreateDirection: false,
          canCreateService: false,
        },
      },
    } as never);

    render(<RouteComponent />);

    expect(screen.queryByRole('link', { name: 'Ajouter une direction' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ajouter un service' })).not.toBeInTheDocument();
  });

  it('hides Service creation for a root-level affectation without an available Direction', () => {
    vi.mocked(useProfile).mockReturnValue({
      data: {
        affectationChain: [{ id: 'root-ars', nomComplet: 'ARS Normandie' }],
      },
    } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        data: [],
        capabilities: {
          canCreateDirection: true,
          canCreateService: false,
        },
        availableDirections: [],
      },
    } as never);

    render(<RouteComponent />);

    expect(screen.queryByRole('link', { name: 'Ajouter un service' })).not.toBeInTheDocument();
  });

  it('links to Direction creation when backend capabilities allow Direction creation', () => {
    vi.mocked(useProfile).mockReturnValue({ data: {} } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        data: [],
        capabilities: {
          canCreateDirection: true,
          canCreateService: false,
        },
      },
    } as never);

    render(<RouteComponent />);

    expect(screen.getByRole('link', { name: 'Ajouter une direction' })).toHaveAttribute(
      'href',
      '/admin/directions-services/directions/create',
    );
    expect(screen.queryByRole('link', { name: 'Ajouter un service' })).not.toBeInTheDocument();
  });

  it('shows an assigned Direction before its descendant Services and preserves Service creation', () => {
    vi.mocked(useProfile).mockReturnValue({
      data: {
        affectationChain: [
          { id: 'root-ars', nomComplet: 'ARS Normandie' },
          { id: 'dir-autonomie', nomComplet: 'Direction Autonomie' },
        ],
      },
    } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        data: [
          {
            id: 'dir-autonomie',
            directionNom: 'Direction Autonomie',
            directionLabel: 'DA',
            serviceNom: '',
            serviceLabel: '',
            email: 'direction-autonomie@ars.fr',
            editId: 'dir-autonomie',
            canEdit: true,
          },
          {
            id: 'service-pa',
            directionNom: 'Direction Autonomie',
            directionLabel: 'DA',
            serviceNom: 'Service PA',
            serviceLabel: 'PA',
            email: 'service-pa@ars.fr',
            editId: 'service-pa',
            canEdit: true,
          },
        ],
        capabilities: {
          canCreateDirection: false,
          canCreateService: true,
        },
        availableDirections: [],
      },
    } as never);

    render(<RouteComponent />);

    const assignedDirectionEdit = screen.getByRole('link', { name: 'Modifier la direction Direction Autonomie' });
    const descendantServiceEdit = screen.getByRole('link', {
      name: 'Modifier le service Service PA de la direction Direction Autonomie',
    });
    expect(assignedDirectionEdit).toHaveAttribute('href', '/admin/directions-services/dir-autonomie/edit');
    expect(
      assignedDirectionEdit.compareDocumentPosition(descendantServiceEdit) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Ajouter une direction' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ajouter un service' })).toHaveAttribute(
      'href',
      '/admin/directions-services/services/create',
    );
  });

  it('passes trimmed search to the directions and services list hook', async () => {
    vi.mocked(useProfile).mockReturnValue({ data: {} } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({ data: { data: [] } } as never);

    render(<RouteComponent />);

    const searchInput = screen.getByRole('searchbox', {
      name: 'Rechercher une organisation par nom ou libellé',
    });
    await userEvent.type(searchInput, ' pa ');
    await userEvent.click(screen.getByRole('button', { name: 'Rechercher' }));

    expect(useDirectionsServicesList).toHaveBeenLastCalledWith({ search: 'pa' });
  });

  it('renders rows after submitting a search', async () => {
    vi.mocked(useProfile).mockReturnValue({ data: {} } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        data: [
          {
            id: 'service-pa',
            directionNom: 'Direction Autonomie',
            directionLabel: 'DA',
            serviceNom: 'Service PA',
            serviceLabel: 'PA',
            email: 'service-pa@ars.fr',
            editId: 'service-pa',
          },
          {
            id: 'service-enfance',
            directionNom: 'Direction Enfance',
            directionLabel: 'DE',
            serviceNom: 'Service Enfance',
            serviceLabel: 'SE',
            email: 'service-enfance@ars.fr',
            editId: 'service-enfance',
          },
        ],
      },
    } as never);

    render(<RouteComponent />);

    const searchInput = screen.getByRole('searchbox', {
      name: 'Rechercher une organisation par nom ou libellé',
    });
    await userEvent.type(searchInput, ' pa ');
    await userEvent.click(screen.getByRole('button', { name: 'Rechercher' }));

    expect(useDirectionsServicesList).toHaveBeenLastCalledWith({ search: 'pa' });
    expect(screen.getByRole('row', { name: /Service PA/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Service Enfance/ })).toBeInTheDocument();
  });

  it('renders local pagination when more than 10 rows are visible', async () => {
    vi.mocked(useProfile).mockReturnValue({ data: {} } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        data: Array.from({ length: 11 }, (_, index) => ({
          id: `service-${index + 1}`,
          directionNom: 'Direction Test',
          directionLabel: 'DT',
          serviceNom: `Service ${index + 1}`,
          serviceLabel: `S${index + 1}`,
          email: `service-${index + 1}@ars.fr`,
          editId: `service-${index + 1}`,
        })),
      },
    } as never);

    render(<RouteComponent />);

    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Service 10/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Service 11/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '2' }));

    expect(screen.getByRole('row', { name: /Service 11/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Service 10/ })).not.toBeInTheDocument();
  });

  it('links an editable row to its local edit route', () => {
    vi.mocked(useProfile).mockReturnValue({ data: {} } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        data: [
          {
            id: 'service-pa',
            directionNom: 'Direction Autonomie',
            directionLabel: 'DA',
            serviceNom: 'Service PA',
            serviceLabel: 'PA',
            email: 'service-pa@ars.fr',
            editId: 'service-pa',
            canEdit: true,
          },
        ],
      },
    } as never);

    render(<RouteComponent />);

    expect(
      screen.getByRole('link', {
        name: 'Modifier le service Service PA de la direction Direction Autonomie',
      }),
    ).toHaveAttribute('href', '/admin/directions-services/service-pa/edit');
  });

  it('gives each available edit action a unique accessible name', () => {
    vi.mocked(useProfile).mockReturnValue({ data: {} } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        data: [
          {
            id: 'dir-autonomie',
            directionNom: 'Direction Autonomie',
            directionLabel: 'DA',
            serviceNom: '',
            serviceLabel: '',
            email: 'direction-autonomie@ars.fr',
            editId: 'dir-autonomie',
            canEdit: true,
          },
          {
            id: 'service-pa',
            directionNom: 'Direction Autonomie',
            directionLabel: 'DA',
            serviceNom: 'Service PA',
            serviceLabel: 'PA',
            email: 'service-pa@ars.fr',
            editId: 'service-pa',
            canEdit: true,
          },
        ],
      },
    } as never);

    render(<RouteComponent />);

    expect(screen.getByRole('link', { name: 'Modifier la direction Direction Autonomie' })).toHaveAttribute(
      'href',
      '/admin/directions-services/dir-autonomie/edit',
    );
    expect(
      screen.getByRole('link', {
        name: 'Modifier le service Service PA de la direction Direction Autonomie',
      }),
    ).toHaveAttribute('href', '/admin/directions-services/service-pa/edit');
  });

  it('hides row edit action when backend row capability disallows edit', () => {
    vi.mocked(useProfile).mockReturnValue({ data: {} } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        data: [
          {
            id: 'dir-test',
            directionNom: 'Direction Test',
            directionLabel: 'DT',
            serviceNom: '',
            serviceLabel: '',
            email: 'direction-test@ars.fr',
            editId: 'dir-test',
            canEdit: false,
          },
        ],
      },
    } as never);

    render(<RouteComponent />);

    expect(screen.queryByRole('link', { name: 'Modifier la direction Direction Test' })).not.toBeInTheDocument();
  });

  it('renders direction and service rows without global admin columns', () => {
    vi.mocked(useProfile).mockReturnValue({ data: {} } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        data: [
          {
            id: 'dir-autonomie',
            directionNom: 'Direction Autonomie',
            directionLabel: 'DA',
            serviceNom: '',
            serviceLabel: '',
            email: 'direction-autonomie@ars.fr',
            editId: 'dir-autonomie',
          },
          {
            id: 'service-pa',
            directionNom: 'Direction Autonomie',
            directionLabel: 'DA',
            serviceNom: 'Service PA',
            serviceLabel: 'PA',
            email: 'service-pa@ars.fr',
            editId: 'service-pa',
          },
        ],
      },
    } as never);

    render(<RouteComponent />);

    expect(screen.getByRole('columnheader', { name: 'Nom de la direction' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Abréviation de la direction' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Nom du service' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Abréviation du service' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'E-mail de notification' })).toBeInTheDocument();
    expect(screen.getAllByRole('cell', { name: 'Direction Autonomie' })).toHaveLength(2);
    expect(screen.getByRole('cell', { name: 'Service PA' })).toBeInTheDocument();
    expect(screen.getByText('service-pa@ars.fr')).toBeInTheDocument();
    expect(screen.queryByText('Contact usager')).not.toBeInTheDocument();
    expect(screen.queryByText('Statut')).not.toBeInTheDocument();
  });
});
